import { config } from "../config";
import type { ValidatedPreferences, ValidatedReflectionInput, ServerChallenge } from "../schemas";

export type AiHealthStatus = "connected" | "unconfigured" | "unavailable";

class Semaphore {
  private current = 0;
  private max: number;
  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<() => void> {
    if (this.current < this.max) {
      this.current++;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

const aiSemaphore = new Semaphore(config.AI_MAX_CONCURRENCY);

export async function checkAiHealth(): Promise<AiHealthStatus> {
  if (config.AI_PROVIDER === "none" || !config.AI_API_URL) {
    return "unconfigured";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    if (config.AI_PROVIDER === "ollama") {
      const res = await fetch(`${config.AI_API_URL.replace(/\/$/, "")}/api/version`, {
        signal: controller.signal,
      });
      return res.ok ? "connected" : "unavailable";
    }

    if (config.AI_PROVIDER === "openai") {
      const res = await fetch(`${config.AI_API_URL.replace(/\/$/, "")}/models`, {
        signal: controller.signal,
        headers: config.AI_API_KEY ? { Authorization: `Bearer ${config.AI_API_KEY}` } : {},
      });
      return res.ok ? "connected" : "unavailable";
    }

    return "unavailable";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(prompt: string, systemPrompt?: string): Promise<string | null> {
  if (config.AI_PROVIDER === "none" || !config.AI_API_URL) {
    return null;
  }

  const release = await aiSemaphore.acquire();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS);

  try {
    const baseUrl = config.AI_API_URL.replace(/\/$/, "");

    if (config.AI_PROVIDER === "ollama") {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.AI_MODEL,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          stream: false,
          format: "json",
          options: {
            temperature: 0.7,
            num_predict: 500,
          },
        }),
      });

      if (!res.ok) {
        console.warn(`[AI] Ollama responded with HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content?.trim() || null;
    }

    if (config.AI_PROVIDER === "openai") {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.AI_API_KEY ? { Authorization: `Bearer ${config.AI_API_KEY}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.AI_MODEL,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.warn(`[AI] OpenAI endpoint responded with HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim() || null;
    }

    return null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[AI] Request timed out after ${config.AI_TIMEOUT_MS}ms`);
    } else {
      console.warn("[AI] Provider call failed:", err instanceof Error ? err.message : String(err));
    }
    return null;
  } finally {
    clearTimeout(timeout);
    release();
  }
}

export async function generateAiChallenge(
  p: ValidatedPreferences,
): Promise<ServerChallenge | null> {
  const systemPrompt = `You are Gemma, an AI that creates small, safe, grounding real-world mindfulness challenges for people stepping away from screens.
You MUST output valid JSON matching this schema:
{
  "title": "string (short, evocative title, max 60 chars)",
  "description": "string (1-2 sentences explaining what to notice or find)",
  "steps": ["array of 3-5 concise, practical instructions"],
  "curiosityPrompt": "string (one thought-provoking question to reflect on)",
  "safetyNote": "string (brief safety advice)"
}
Rules:
- Never ask the user to trespass, climb, enter hazardous traffic, touch wildlife, or do anything dangerous.
- Focus strictly on real-world sensory observation (sight, sound, texture, shadows, nature).`;

  const userPrompt = `Create an outdoor challenge for:
Duration: ${p.durationMinutes} minutes
Environment: ${p.environment}
Category: ${p.category}
Difficulty: ${p.difficulty}

Return ONLY valid JSON.`;

  const content = await callProvider(userPrompt, systemPrompt);
  if (!content) return null;

  try {
    const raw = JSON.parse(content);
    if (
      typeof raw.title !== "string" ||
      typeof raw.description !== "string" ||
      !Array.isArray(raw.steps) ||
      raw.steps.length < 2 ||
      typeof raw.curiosityPrompt !== "string"
    ) {
      return null;
    }

    const steps = raw.steps
      .filter((s: unknown) => typeof s === "string" && s.trim())
      .map((s: string) => s.trim().slice(0, 300))
      .slice(0, 6);

    if (steps.length < 2) return null;

    return {
      id: `gemma-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: raw.title.trim().slice(0, 100),
      description: raw.description.trim().slice(0, 500),
      durationMinutes: p.durationMinutes,
      difficulty: p.difficulty,
      category: p.category,
      environment: p.environment,
      steps,
      curiosityPrompt: raw.curiosityPrompt.trim().slice(0, 250),
      safetyNote:
        typeof raw.safetyNote === "string" && raw.safetyNote.trim()
          ? raw.safetyNote.trim().slice(0, 250)
          : "Stay in a safe, accessible place. Do not enter restricted areas or approach traffic.",
      generationMode: "gemma",
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function generateAiReflection(
  input: ValidatedReflectionInput,
): Promise<string | null> {
  const systemPrompt = `You are Gemma, an AI that reads what a user observed during their outdoor challenge and provides a warm, grounded 1-2 sentence reflection.
Rules:
- Max 400 characters.
- Never claim to have verified their activity or photos.
- Be encouraging and observant of human experience.
- Do NOT output markdown or quotation marks, just the plain reflection text.`;

  const userPrompt = `Challenge: "${input.challengeTitle}"
User's observation: "${input.observation}"
Provide a brief, thoughtful reflection on what they noticed.`;

  const release = await aiSemaphore.acquire();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS);

  try {
    const baseUrl = config.AI_API_URL.replace(/\/$/, "");
    if (config.AI_PROVIDER === "ollama") {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.AI_MODEL,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: { temperature: 0.7, num_predict: 150 },
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { response?: string };
      return data.response?.trim().slice(0, 600) || null;
    }

    if (config.AI_PROVIDER === "openai") {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.AI_API_KEY ? { Authorization: `Bearer ${config.AI_API_KEY}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim().slice(0, 600) || null;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    release();
  }
}

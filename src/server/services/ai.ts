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

const CATEGORY_DIRECTIVES: Record<ValidatedPreferences["category"], string> = {
  notice:
    "PRIMARY MODALITY: Visual & Tactile Micro-Details.\n- Direct attention to overlooked physical details: surface textures, cracks in stone or pavement, moss, architectural joints, rust patterns, weathered wood, paint layers, geometric irregularities.\n- STRICT RULE: Do NOT create an auditory/listening mission. Focus on seeing and touching.",
  listen:
    "PRIMARY MODALITY: Pure Auditory Soundscapes.\n- Direct attention to distinct acoustic layers: distant vs foreground sounds, quietest ambient hum, vibrations, air currents, cadence of passing life, reverberations.",
  find: "PRIMARY MODALITY: Physical Scavenger Quest.\n- Challenge the user to seek a specific physical occurrence or visual relationship: e.g. two disparate objects sharing an exact hue, an unexpected geometric curve, a material modified by years of weather, contrasting textures side-by-side.\n- STRICT RULE: Do NOT create an auditory/listening mission. Focus on finding and comparing physical objects.",
  observe:
    "PRIMARY MODALITY: Temporal Shifts & Movement.\n- Direct attention to dynamic changes unfolding over time: how shadows stretch or soften across a wall, how sunlight filters through leaves, moving reflections, sway in the breeze, patterns of movement in the surroundings.\n- STRICT RULE: Do NOT create an auditory/listening mission. Focus on watching changes over time.",
  reflect:
    "PRIMARY MODALITY: Embodied Stillness & Atmospheric Awareness.\n- Ground the participant in immediate physical presence: body weight, air temperature on skin, horizon lines, breathing without urgency, letting the space exist around them without seeking. Focus on calm spatial grounding.",
};

const CONSTRAINT_DIRECTIVES: Record<NonNullable<ValidatedPreferences["constraint"]>, string> = {
  none: "No physical movement restrictions.",
  seated:
    "STRICT ACCESSIBILITY REQUIREMENT: The user MUST remain comfortably seated throughout the entire mission (on a chair, bench, porch step, or wheelchair). NEVER tell them to walk, stroll, pace, wander, or change locations. All actions must be performed while seated.",
  quiet:
    "STRICT ACCESSIBILITY REQUIREMENT: Must take place in a peaceful, low-stimulation, low-noise area. Avoid busy streets, traffic, crowds, or overstimulating spaces.",
  indoor_adjacent:
    "STRICT ACCESSIBILITY REQUIREMENT: Must be executable from immediately accessible spaces: an open window, balcony, doorway, porch, or doorstep without leaving the building threshold.",
};

const ENVIRONMENT_DIRECTIVES: Record<ValidatedPreferences["environment"], string> = {
  home: "ENVIRONMENT: Private residence, balcony, window, or immediate yard. Must be 100% achievable without leaving the home.",
  neighbourhood:
    "ENVIRONMENT: Residential streets, sidewalks, building fronts, alleyways, or nearby walkways.",
  park: "ENVIRONMENT: Park, garden, trees, green space, earth, plants, or natural trails.",
  urban:
    "ENVIRONMENT: Commercial streets, concrete, brick, storefronts, transit stops, architectural structures.",
};

export function validateAiChallengeOutput(
  raw: unknown,
  p: ValidatedPreferences,
): ServerChallenge | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const title = typeof data["title"] === "string" ? data["title"].trim() : "";
  const description = typeof data["description"] === "string" ? data["description"].trim() : "";
  const curiosityPrompt =
    typeof data["curiosityPrompt"] === "string" ? data["curiosityPrompt"].trim() : "";
  const safetyNote =
    typeof data["safetyNote"] === "string" && data["safetyNote"].trim()
      ? data["safetyNote"].trim().slice(0, 250)
      : "Stay in a safe, accessible place. Do not enter restricted areas or approach traffic.";

  if (!title || title.length < 3 || title.length > 100) return null;
  if (!description || description.length < 10 || description.length > 500) return null;
  if (!curiosityPrompt || curiosityPrompt.length < 5 || curiosityPrompt.length > 250) return null;

  if (!Array.isArray(data["steps"])) return null;
  const rawSteps = data["steps"].filter((s) => typeof s === "string" && s.trim()) as string[];
  if (rawSteps.length < 2 || rawSteps.length > 6) return null;

  const steps = rawSteps.map((s) => s.trim().slice(0, 300));

  // 1. Cliché check: Avoid repetitive title formulas like "Echoes of..." or static placeholders
  if (
    /^(?:echoes|whispers|symphony|rhythm)\s+of\b/i.test(title) ||
    /^(?:the\s+)?granite\s+seam$/i.test(title)
  ) {
    console.warn(
      `[AI Validation] Rejected mission with cliché or repetitive title for '${p.category}': "${title}"`,
    );
    return null;
  }

  // 2. Category alignment check: Ensure non-listen categories are not solely auditory listening missions
  if (p.category !== "listen") {
    const combined = `${title} ${description} ${curiosityPrompt} ${steps.join(" ")}`.toLowerCase();
    const soundKeywords = [
      "listen closely to",
      "subtle sounds",
      "soundscape",
      "sounds of the",
      "hear the sounds",
    ];
    const visualTactileKeywords = [
      "look",
      "see",
      "watch",
      "notice",
      "texture",
      "color",
      "colour",
      "light",
      "shadow",
      "shape",
      "material",
      "surface",
      "touch",
      "find",
      "spot",
      "observe",
      "still",
      "breathe",
      "presence",
      "pace",
      "step",
      "seat",
    ];

    const soundsExclusively =
      soundKeywords.some((k) => combined.includes(k)) &&
      !visualTactileKeywords.some((k) => combined.includes(k));
    if (soundsExclusively) {
      console.warn(
        `[AI Validation] Rejected mission misaligned with category '${p.category}': auditory-only content`,
      );
      return null;
    }
  }

  // 3. Duration budget check: Total explicit minutes declared across steps must not exceed budget
  let totalExplicitMinutes = 0;
  for (const step of steps) {
    const minMatches = Array.from(step.matchAll(/(\d+)\s*(?:minutes?|mins?)\b/gi));
    for (const match of minMatches) {
      const minutes = parseInt(match[1] || "0", 10);
      if (minutes > p.durationMinutes) {
        console.warn(
          `[AI Validation] Rejected step requiring ${minutes}m which exceeds total mission budget of ${p.durationMinutes}m`,
        );
        return null;
      }
      totalExplicitMinutes += minutes;
    }
  }
  if (totalExplicitMinutes > Math.round(p.durationMinutes * 1.25)) {
    console.warn(
      `[AI Validation] Rejected steps exceeding duration budget: declared ${totalExplicitMinutes}m > budget ${p.durationMinutes}m`,
    );
    return null;
  }

  // 4. Constraint consistency check:
  if (p.constraint === "seated") {
    const fullText = `${description} ${steps.join(" ")}`.toLowerCase();
    if (/\b(?:walk|stroll|hike|wander|jog|run|march)\b/i.test(fullText)) {
      console.warn(
        `[AI Validation] Rejected seated mission containing active walking instructions`,
      );
      return null;
    }
  }

  // 5. Phone-free & Safety forbidden actions
  const fullText = `${title} ${description} ${steps.join(" ")}`.toLowerCase();
  if (
    /\b(?:photo|photograph|camera|selfie|picture|snapshot|gps|buy|purchase|stranger)\b/i.test(
      fullText,
    )
  ) {
    console.warn(
      `[AI Validation] Rejected mission containing forbidden actions (camera/GPS/purchases/strangers)`,
    );
    return null;
  }

  return {
    id: `gemma-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    description,
    durationMinutes: p.durationMinutes,
    difficulty: p.difficulty,
    category: p.category,
    environment: p.environment,
    steps,
    curiosityPrompt,
    safetyNote,
    generationMode: "gemma",
    createdAt: new Date().toISOString(),
  };
}

export async function generateAiChallenge(
  p: ValidatedPreferences,
): Promise<ServerChallenge | null> {
  const categoryGuide = CATEGORY_DIRECTIVES[p.category];
  const constraintGuide = CONSTRAINT_DIRECTIVES[p.constraint ?? "none"];
  const environmentGuide = ENVIRONMENT_DIRECTIVES[p.environment];

  const systemPrompt = `You are Gemma, the architect of 'The Invisible Mission' for StepOut.
Your core principle: AI designs the mission. The user locks their phone. Real life becomes the experience.

You MUST output valid JSON matching this schema:
{
  "title": "string (evocative, fresh, tactile mission title, max 60 chars)",
  "description": "string (1-2 sentences setting the stage for what to notice)",
  "steps": ["array of 3-5 concise, practical instructions to do in the physical world"],
  "curiosityPrompt": "string (one clear, memorable observation goal or question to hold in mind while phone is locked)",
  "safetyNote": "string (brief practical safety advice)"
}

CATEGORY DIRECTIVE:
${categoryGuide}

ENVIRONMENT DIRECTIVE:
${environmentGuide}

ACCESSIBILITY / CONSTRAINT:
${constraintGuide}

DURATION BUDGET:
- Total time allotted: ${p.durationMinutes} minutes.
- The steps MUST fit comfortably within ${p.durationMinutes} minutes.
- If steps mention specific minute durations, their sum MUST NOT exceed ${p.durationMinutes} minutes.

CREATIVE & DIVERSITY RULES:
- Invent a fresh, original title directly capturing the concrete focal point (2 to 4 words).
- FORBIDDEN: Do NOT reuse static names like "The Granite Seam", and NEVER use cliché patterns like "Echoes of...", "Whispers of...", "Symphony of...", "Rhythm of...".
- Pure real-world: Works entirely without photography, camera, screen checks, or GPS.
- Phone-free: Explicitly tell the user in step 1 or 2 to lock their phone and step into their surroundings.
- Safe: Never require buying anything, entering unsafe or private places, climbing, or interacting with strangers.`;

  const userPrompt = `Design a unique, immersive Invisible Mission:
- Category: ${p.category.toUpperCase()} (${categoryGuide.split("\n")[0]})
- Environment: ${p.environment}
- Duration Budget: ${p.durationMinutes} minutes maximum
- Difficulty: ${p.difficulty}
- Constraint: ${p.constraint ?? "none"}

Generate a fresh mission tailored directly to the specific environment (${p.environment}) and category modality (${p.category}).
Focus on concrete physical elements (e.g. bark, tile joint, doorstep shadows, breeze, windowsill, pavement grain).
Give it an original, non-generic title.
Return ONLY valid JSON.`;

  const content = await callProvider(userPrompt, systemPrompt);
  if (!content) return null;

  try {
    const rawClean = content.startsWith("```")
      ? content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim()
      : content.trim();
    const raw = JSON.parse(rawClean);
    return validateAiChallengeOutput(raw, p);
  } catch (err) {
    console.warn("[AI] Failed to parse generated challenge JSON:", err);
    return null;
  }
}

function cleanModelText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const keys = [
        "question",
        "followUpQuestion",
        "follow_up",
        "followUp",
        "inquiry",
        "reflection",
        "insight",
        "takeaway",
        "response",
        "text",
        "message",
      ];
      for (const k of keys) {
        const val = parsed[k];
        if (typeof val === "string" && val.trim()) {
          text = val.trim();
          break;
        }
      }
      if (text.startsWith("{")) {
        const candidate =
          Object.values(parsed).find((v) => typeof v === "string" && (v as string).includes("?")) ||
          Object.values(parsed).find((v) => typeof v === "string" && (v as string).trim());
        if (typeof candidate === "string" && candidate.trim()) {
          text = candidate.trim();
        }
      }
    } catch {
      const match = text.match(
        /"(?:question|followUpQuestion|follow_up|followUp|inquiry|reflection|insight|takeaway|response|text|message)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      );
      if (match && match[1]) {
        text = match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
      }
    }
  }
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text || null;
}

export async function generateAiFollowUp(input: ValidatedReflectionInput): Promise<string | null> {
  const systemPrompt = `You are Gemma, the reflective guide for StepOut's Invisible Mission.
The user just returned from their mission and shared what they noticed.
Ask ONE concise, curious, and relevant follow-up question based specifically on what they actually observed.
You MUST output valid JSON matching this schema:
{
  "question": "string (one concise question ending with a question mark, max 180 chars)"
}
Rules:
- Max 180 characters.
- Must end with a question mark.
- Do NOT praise, judge, score, or use generic platitudes.
- Probe gently into their direct physical attention (e.g., whether they noticed it immediately or after slowing down, how light/sound shifted, or what made them pause there).`;

  const userPrompt = `Mission Title: "${input.challengeTitle}"
User's observation: "${input.observation}"

Return JSON with "question".`;

  const content = await callProvider(userPrompt, systemPrompt);
  return cleanModelText(content);
}

export async function generateAiSynthesis(
  input: ValidatedReflectionInput,
): Promise<{ insight: string; takeaway: string } | null> {
  const systemPrompt = `You are Gemma, compiling a Field Report for StepOut's Invisible Mission.
Generate a calm, grounded field journal insight and a short takeaway phrase based strictly on the user's observation and reflection.
You MUST output valid JSON matching this schema:
{
  "insight": "string (1-2 sentences of thoughtful synthesis directly referencing their observation, max 280 chars)",
  "takeaway": "string (one concise, memorable takeaway phrase to carry into the rest of the day, max 100 chars)"
}
Rules:
- Never fabricate details or claim to have verified their presence.
- Keep the tone editorial, observant, and grounded.`;

  const followUpContext =
    input.followUpQuestion && input.followUpAnswer
      ? `\nFollow-up question: "${input.followUpQuestion}"\nUser's reply: "${input.followUpAnswer}"`
      : "";

  const userPrompt = `Mission: "${input.challengeTitle}"
Observation: "${input.observation}"${followUpContext}

Return JSON with insight and takeaway.`;

  const content = await callProvider(userPrompt, systemPrompt);
  if (!content) return null;

  try {
    const rawClean = content.startsWith("```")
      ? content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim()
      : content.trim();
    const parsed = JSON.parse(rawClean);
    const insight = cleanModelText(parsed.insight);
    const takeaway = cleanModelText(parsed.takeaway) || "Notice what hurry conceals.";
    if (insight) {
      return {
        insight: insight.slice(0, 350),
        takeaway: takeaway.slice(0, 120),
      };
    }
    return null;
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
      return cleanModelText(data.response)?.slice(0, 600) || null;
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
      return cleanModelText(data.choices?.[0]?.message?.content)?.slice(0, 600) || null;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    release();
  }
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts and cleans text from potential JSON wrappers, markdown fences,
 * or raw model payloads (e.g. `{ "question": "..." }`).
 */
export function extractCleanText(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  let text = raw.trim();

  // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  // If it is a JSON object string like { "question": "..." }
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
        "content",
      ];
      for (const k of keys) {
        const val = parsed[k];
        if (typeof val === "string" && val.trim()) {
          text = val.trim();
          break;
        }
      }
      // If none of known keys matched, look for any string property
      if (text.startsWith("{")) {
        const candidate =
          Object.values(parsed).find((v) => typeof v === "string" && (v as string).includes("?")) ||
          Object.values(parsed).find((v) => typeof v === "string" && (v as string).trim());
        if (typeof candidate === "string" && candidate.trim()) {
          text = candidate.trim();
        }
      }
    } catch {
      // Regex fallback for malformed JSON strings
      const match = text.match(
        /"(?:question|followUpQuestion|follow_up|followUp|inquiry|reflection|insight|takeaway|response|text|message|content)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      );
      if (match && match[1]) {
        text = match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
      }
    }
  }

  // Strip surrounding quotes if present: "..." or '...' or “...”
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }

  return text;
}

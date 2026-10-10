import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // AI Configuration
  AI_PROVIDER: z.enum(["none", "ollama", "openai"]).default("none"),
  AI_API_URL: z.string().default(""),
  AI_MODEL: z.string().default("gemma:2b"),
  AI_API_KEY: z.string().default(""),
  AI_TIMEOUT_MS: z.coerce.number().default(20000),
  AI_MAX_CONCURRENCY: z.coerce.number().default(3),

  // Rate Limiting
  RATE_LIMIT_GENERAL_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_CHALLENGES_MAX: z.coerce.number().default(15),
  RATE_LIMIT_REFLECTIONS_MAX: z.coerce.number().default(15),

  // Database (Optional)
  MONGODB_URI: z.string().default(""),
  MONGODB_DB_NAME: z.string().default("stepout"),

  // Network / Security
  ALLOWED_ORIGINS: z.string().default(""),
  TRUST_PROXY: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("true"),
});

export type ServerConfig = z.infer<typeof EnvSchema>;

function loadConfig(): ServerConfig {
  const mergedEnv = {
    ...process.env,
    AI_PROVIDER:
      process.env["AI_PROVIDER"] || (process.env["OLLAMA_BASE_URL"] ? "ollama" : undefined),
    AI_API_URL: process.env["AI_API_URL"] || process.env["OLLAMA_BASE_URL"] || undefined,
    AI_MODEL: process.env["AI_MODEL"] || process.env["OLLAMA_MODEL"] || undefined,
    AI_API_KEY: process.env["AI_API_KEY"] || process.env["OLLAMA_API_KEY"] || undefined,
    AI_TIMEOUT_MS: process.env["AI_TIMEOUT_MS"] || process.env["OLLAMA_TIMEOUT_MS"] || undefined,
  };

  const result = EnvSchema.safeParse(mergedEnv);
  if (!result.success) {
    console.error("Configuration validation failed:", result.error.format());
    // Fall back to defaults rather than crashing if non-fatal
    return EnvSchema.parse({});
  }
  return result.data;
}

export const config = loadConfig();

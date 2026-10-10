import { checkAiHealth } from "../services/ai";
import { checkDbHealth } from "../services/db";
import { config } from "../config";

export async function handleHealth(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed", message: "Health check only supports GET" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          Allow: "GET, HEAD",
        },
      },
    );
  }

  const [aiStatus, dbStatus] = await Promise.all([checkAiHealth(), checkDbHealth()]);

  const body = {
    status: "ok",
    version: "1.0.0",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    ai: {
      status: aiStatus,
      provider: config.AI_PROVIDER,
      model: config.AI_PROVIDER !== "none" ? config.AI_MODEL : undefined,
    },
    db: {
      status: dbStatus,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

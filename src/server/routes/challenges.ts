import { parseJsonBody, BodyParsingError } from "../middleware/body-parser";
import { checkRateLimit, getClientIp } from "../middleware/rate-limiter";
import { PreferencesSchema } from "../schemas";
import { generateChallengeService } from "../services/challenges";

export async function handleChallenges(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Only POST is supported for challenge generation",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          Allow: "POST",
        },
      },
    );
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp, "challenges");
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        message:
          "Challenge generation rate limit exceeded. Please wait before requesting another challenge.",
        retryAfter: rateLimit.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch (err) {
    if (err instanceof BodyParsingError) {
      return new Response(JSON.stringify({ error: err.code, message: err.message }), {
        status: err.statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ error: "BAD_REQUEST", message: "Invalid request payload" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const parseResult = PreferencesSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        message: "Invalid challenge generation preferences",
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const challenge = await generateChallengeService(parseResult.data);
    return new Response(JSON.stringify(challenge), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Challenges] Internal error generating challenge:", err);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "Unable to generate challenge at this time",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

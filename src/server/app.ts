import { handleCors, applySecurityHeaders } from "./middleware/security";
import { checkRateLimit, getClientIp } from "./middleware/rate-limiter";
import { handleHealth } from "./routes/health";
import { handleChallenges } from "./routes/challenges";
import { handleReflections } from "./routes/reflections";

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const headers = new Headers();
    handleCors(request, headers);
    applySecurityHeaders(headers);
    return new Response(null, { status: 204, headers });
  }

  // General rate limiting (excluding health check)
  if (pathname !== "/api/health") {
    const clientIp = getClientIp(request);
    const generalLimit = checkRateLimit(clientIp, "general");
    if (!generalLimit.allowed) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Retry-After": String(generalLimit.retryAfterSeconds),
      });
      applySecurityHeaders(headers);
      handleCors(request, headers);
      return new Response(
        JSON.stringify({
          error: "TOO_MANY_REQUESTS",
          message: "Too many requests to StepOut API. Please slow down.",
          retryAfter: generalLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers,
        },
      );
    }
  }

  let response: Response;

  try {
    if (pathname === "/api/health") {
      response = await handleHealth(request);
    } else if (pathname === "/api/challenges/generate") {
      response = await handleChallenges(request);
    } else if (pathname === "/api/reflections/generate") {
      response = await handleReflections(request);
    } else {
      response = new Response(
        JSON.stringify({
          error: "NOT_FOUND",
          message: `Endpoint ${pathname} does not exist`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    console.error(`[API] Unhandled error handling ${pathname}:`, err);
    response = new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An internal server error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Clone or reconstruct response to apply security & CORS headers cleanly
  const responseHeaders = new Headers(response.headers);
  applySecurityHeaders(responseHeaders);
  handleCors(request, responseHeaders);
  responseHeaders.delete("x-powered-by");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

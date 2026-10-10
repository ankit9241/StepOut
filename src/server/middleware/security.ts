import { config } from "../config";

export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "0");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';",
  );

  if (config.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export function handleCors(request: Request, responseHeaders: Headers): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin or server-to-server request
    return false;
  }

  const allowedOrigins = config.ALLOWED_ORIGINS
    ? config.ALLOWED_ORIGINS.split(",").map((o) => o.trim().toLowerCase())
    : [];

  const host = request.headers.get("host")?.toLowerCase();
  const requestUrl = new URL(request.url);
  const isSameHost =
    origin.toLowerCase().includes(host || "") ||
    origin.toLowerCase() === requestUrl.origin.toLowerCase();

  if (isSameHost || allowedOrigins.includes(origin.toLowerCase()) || allowedOrigins.includes("*")) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    responseHeaders.set("Access-Control-Max-Age", "86400");
    return true;
  }

  return false;
}

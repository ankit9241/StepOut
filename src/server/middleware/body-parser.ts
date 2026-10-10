const MAX_JSON_SIZE = 50 * 1024; // 50 KB

export class BodyParsingError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "BodyParsingError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new BodyParsingError(
      "Content-Type must be application/json",
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_JSON_SIZE) {
    throw new BodyParsingError(
      `Request body exceeds maximum size limit of ${MAX_JSON_SIZE} bytes`,
      413,
      "PAYLOAD_TOO_LARGE",
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch (err) {
    throw new BodyParsingError("Failed to read request body", 400, "INVALID_BODY");
  }

  if (new TextEncoder().encode(text).length > MAX_JSON_SIZE) {
    throw new BodyParsingError(
      `Request body exceeds maximum size limit of ${MAX_JSON_SIZE} bytes`,
      413,
      "PAYLOAD_TOO_LARGE",
    );
  }

  if (!text || !text.trim()) {
    throw new BodyParsingError("Request body cannot be empty", 400, "EMPTY_BODY");
  }

  // Strip UTF-8 byte order mark (BOM) if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BodyParsingError("Malformed JSON in request body", 400, "INVALID_JSON");
  }
}

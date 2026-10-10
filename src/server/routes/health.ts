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

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

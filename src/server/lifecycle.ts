import { closeDb } from "./services/db";

let shutdownRegistered = false;

export function registerGracefulShutdown(): void {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  const onShutdown = async (signal: string) => {
    console.log(`[Lifecycle] Received ${signal}. Starting graceful shutdown...`);

    // Set a force-exit timeout in case cleanup hangs
    const timer = setTimeout(() => {
      console.error("[Lifecycle] Forced exit after timeout.");
      process.exit(1);
    }, 10000);
    timer.unref?.();

    try {
      await closeDb();
      console.log("[Lifecycle] Cleanup completed cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("[Lifecycle] Error during cleanup:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => onShutdown("SIGTERM"));
  process.on("SIGINT", () => onShutdown("SIGINT"));
}

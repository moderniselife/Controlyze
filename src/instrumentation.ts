export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    
    // Start scheduler with 30 second interval
    const interval = parseInt(process.env.SCHEDULER_INTERVAL || "30000", 10);
    console.log("[Instrumentation] Starting scheduler...");
    startScheduler(interval);
  }
}

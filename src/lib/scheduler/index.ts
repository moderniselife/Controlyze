// In-process scheduler for running periodic tasks
// This runs inside the Next.js server process

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

async function runCronJob() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Use internal function call instead of HTTP to avoid issues during SSR
    const { evaluateAlerts } = await import("@/lib/alerts/evaluator");
    const { recordUptimeCheck } = await import("@/lib/uptime/tracker");

    await recordUptimeCheck();
    await evaluateAlerts();
  } catch (error) {
    console.error("[Scheduler] Error running cron job:", error);
  } finally {
    isRunning = false;
  }
}

export function startScheduler(intervalMs: number = 30000) {
  if (intervalId) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log(`[Scheduler] Starting with interval ${intervalMs}ms`);
  
  // Run immediately
  runCronJob();
  
  // Then run periodically
  intervalId = setInterval(runCronJob, intervalMs);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Stopped");
  }
}

export function isSchedulerRunning() {
  return intervalId !== null;
}

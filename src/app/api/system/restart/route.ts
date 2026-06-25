import { NextResponse } from "next/server";
import { restartContainer } from "@/lib/docker/containers";

export async function POST() {
  try {
    // Try to find and restart the Controlyze container
    // First, try to get the container ID from environment or hostname
    const containerId = process.env.HOSTNAME || "";
    
    if (!containerId) {
      return NextResponse.json(
        { success: false, error: "Cannot determine container ID" },
        { status: 400 }
      );
    }

    // Use Docker socket to restart the container. Do not fall back to
    // process.exit(); unauthenticated or accidental calls should never be able
    // to kill the management process if Docker restart is unavailable.
    await restartContainer(containerId);
    return NextResponse.json({ success: true, message: "Restart initiated" });
  } catch (error) {
    console.error("Error restarting container:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restart container" },
      { status: 500 }
    );
  }
}

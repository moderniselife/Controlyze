import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

    // Use Docker socket to restart the container
    // This requires the Docker socket to be mounted
    try {
      await execAsync(`docker restart ${containerId}`);
      return NextResponse.json({ success: true, message: "Restart initiated" });
    } catch (dockerError) {
      // If direct docker command fails, try using curl to Docker API
      try {
        await execAsync(`curl -X POST --unix-socket /var/run/docker.sock http://localhost/containers/${containerId}/restart`);
        return NextResponse.json({ success: true, message: "Restart initiated" });
      } catch (curlError) {
        // Last resort - just exit the process and let Docker restart policy handle it
        console.log("Initiating process exit for restart...");
        setTimeout(() => process.exit(0), 1000);
        return NextResponse.json({ success: true, message: "Restart initiated via process exit" });
      }
    }
  } catch (error) {
    console.error("Error restarting container:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restart container" },
      { status: 500 }
    );
  }
}

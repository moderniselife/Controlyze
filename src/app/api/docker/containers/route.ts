import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker/containers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") !== "false";

    const containers = await listContainers(all);

    return NextResponse.json({
      success: true,
      data: containers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error listing containers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

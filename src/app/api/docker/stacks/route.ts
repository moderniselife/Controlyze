import { NextResponse } from "next/server";
import { listStacks, getStandaloneContainers } from "@/lib/docker/stacks";

export async function GET() {
  try {
    const stacks = await listStacks();
    const standalone = await getStandaloneContainers();

    return NextResponse.json({
      success: true,
      data: {
        stacks,
        standalone,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error listing stacks:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

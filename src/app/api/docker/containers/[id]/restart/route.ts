import { NextResponse } from "next/server";
import { restartContainer } from "@/lib/docker/containers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await restartContainer(id);

    return NextResponse.json({
      success: true,
      message: `Container ${id} restarted`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error restarting container:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { startContainer } from "@/lib/docker/containers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await startContainer(id);

    return NextResponse.json({
      success: true,
      message: `Container ${id} started`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error starting container:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

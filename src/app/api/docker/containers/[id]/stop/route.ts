import { NextResponse } from "next/server";
import { stopContainer } from "@/lib/docker/containers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await stopContainer(id);

    return NextResponse.json({
      success: true,
      message: `Container ${id} stopped`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error stopping container:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

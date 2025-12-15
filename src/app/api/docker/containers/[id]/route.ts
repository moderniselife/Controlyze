import { NextResponse } from "next/server";
import { getContainer } from "@/lib/docker/containers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = await getContainer(id);

    if (!container) {
      return NextResponse.json(
        { success: false, error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: container,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting container:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

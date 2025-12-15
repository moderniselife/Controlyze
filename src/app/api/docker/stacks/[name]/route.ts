import { NextResponse } from "next/server";
import { getStack } from "@/lib/docker/stacks";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const stack = await getStack(name);

    if (!stack) {
      return NextResponse.json(
        { success: false, error: "Stack not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stack,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting stack:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

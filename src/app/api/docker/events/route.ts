import { NextResponse } from "next/server";
import { getEvents } from "@/lib/docker/events";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since")
      ? parseInt(searchParams.get("since")!)
      : Math.floor(Date.now() / 1000) - 3600;
    const until = searchParams.get("until")
      ? parseInt(searchParams.get("until")!)
      : undefined;

    const events = await getEvents({ since, until });

    return NextResponse.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting events:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

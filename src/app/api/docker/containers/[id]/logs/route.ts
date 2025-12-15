import { NextResponse } from "next/server";
import { getContainerLogs } from "@/lib/docker/containers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const tail = parseInt(searchParams.get("tail") || "100");
    const since = searchParams.get("since")
      ? parseInt(searchParams.get("since")!)
      : undefined;
    const until = searchParams.get("until")
      ? parseInt(searchParams.get("until")!)
      : undefined;
    const timestamps = searchParams.get("timestamps") !== "false";

    const logs = await getContainerLogs(id, { tail, since, until, timestamps });

    const lines = logs
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const cleaned = line.replace(/^[\x00-\x08]/, "");
        const timestampMatch = cleaned.match(
          /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/
        );
        if (timestampMatch) {
          return {
            timestamp: timestampMatch[1],
            message: timestampMatch[2],
            stream: line.charCodeAt(0) === 2 ? "stderr" : "stdout",
          };
        }
        return {
          timestamp: null,
          message: cleaned,
          stream: line.charCodeAt(0) === 2 ? "stderr" : "stdout",
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        containerId: id,
        lines,
        raw: logs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting container logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

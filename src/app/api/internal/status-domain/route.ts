import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  // Only allow internal requests
  const internalHeader = request.headers.get("x-internal-request");
  if (internalHeader !== "true") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const config = loadRawConfig();
    const domain = config.statusPage?.domain || "";
    
    return NextResponse.json({ domain });
  } catch (error) {
    console.error("Error loading status domain config:", error);
    return NextResponse.json({ domain: "" });
  }
}

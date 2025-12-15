import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";

export async function GET() {
  try {
    const config = loadRawConfig();
    
    const authConfig = {
      enabled: config.auth?.enabled ?? false,
      provider: config.auth?.provider ?? "local",
      users: (config.auth?.local?.users || []).map((u: any) => ({
        username: u.username,
      })),
    };

    return NextResponse.json({
      success: true,
      data: authConfig,
    });
  } catch (error) {
    console.error("Error fetching auth config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch auth config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = loadRawConfig();

    // Update auth section
    config.auth = {
      ...config.auth,
      enabled: body.enabled ?? config.auth?.enabled ?? false,
      provider: body.provider ?? config.auth?.provider ?? "local",
    };

    // Preserve existing users if not provided
    if (!config.auth.local) {
      config.auth.local = { users: [] };
    }

    saveRawConfig(config);
    resetConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving auth config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save auth config" },
      { status: 500 }
    );
  }
}

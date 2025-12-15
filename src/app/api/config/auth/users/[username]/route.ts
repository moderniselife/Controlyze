import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const config = loadRawConfig();

    if (!config.auth?.local?.users) {
      return NextResponse.json(
        { success: false, error: "No users configured" },
        { status: 404 }
      );
    }

    const userIndex = config.auth.local.users.findIndex(
      (u: any) => u.username === username
    );

    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    config.auth.local.users.splice(userIndex, 1);

    // Disable auth if no users left
    if (config.auth.local.users.length === 0) {
      config.auth.enabled = false;
    }

    saveRawConfig(config);
    resetConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

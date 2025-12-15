import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password required" },
        { status: 400 }
      );
    }

    const config = loadRawConfig();

    // Initialize auth structure if needed
    if (!config.auth) {
      config.auth = { enabled: true, provider: "local" };
    }
    if (!config.auth.local) {
      config.auth.local = { users: [] };
    }
    if (!config.auth.local.users) {
      config.auth.local.users = [];
    }

    // Check if user already exists
    const existingUser = config.auth.local.users.find(
      (u: any) => u.username === username
    );
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password and add user
    const passwordHash = await bcrypt.hash(password, 12);
    config.auth.local.users.push({ username, passwordHash });

    // Enable auth if adding first user
    if (config.auth.local.users.length === 1) {
      config.auth.enabled = true;
      config.auth.provider = "local";
    }

    saveRawConfig(config);
    resetConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add user" },
      { status: 500 }
    );
  }
}

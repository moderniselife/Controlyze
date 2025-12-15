import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authEnabled = isAuthEnabled();

    if (!authEnabled) {
      return NextResponse.json({
        success: true,
        authEnabled: false,
        user: null,
      });
    }

    const username = await getCurrentUser();

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          authEnabled: true,
          user: null,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authEnabled: true,
      user: { username },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

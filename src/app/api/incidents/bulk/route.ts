import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// Bulk update incidents
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No incident IDs provided" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: "No status provided" },
        { status: 400 }
      );
    }

    const validStatuses = ["open", "investigating", "mitigated", "resolved"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update all incidents
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    // If resolving, set resolvedAt
    if (status === "resolved") {
      updateData.resolvedAt = new Date();
    }

    await db
      .update(incidents)
      .set(updateData)
      .where(inArray(incidents.id, ids));

    return NextResponse.json({
      success: true,
      updated: ids.length,
      status,
    });
  } catch (error) {
    console.error("Error bulk updating incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incidents" },
      { status: 500 }
    );
  }
}

// Bulk delete incidents
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No incident IDs provided" },
        { status: 400 }
      );
    }

    await db.delete(incidents).where(inArray(incidents.id, ids));

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error) {
    console.error("Error bulk deleting incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete incidents" },
      { status: 500 }
    );
  }
}

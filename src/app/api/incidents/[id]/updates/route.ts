import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidentUpdates, incidents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

// GET updates for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const updates = await db
      .select()
      .from(incidentUpdates)
      .where(eq(incidentUpdates.incidentId, id))
      .orderBy(desc(incidentUpdates.createdAt));

    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error("Error fetching incident updates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

// POST a new update to an incident
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status, message, isPublic = true } = body;

    if (!status || !message) {
      return NextResponse.json(
        { success: false, error: "Status and message are required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Create the update
    const update = {
      id: crypto.randomUUID(),
      incidentId: id,
      status,
      message,
      isPublic,
      createdAt: now,
    };

    await db.insert(incidentUpdates).values(update);

    // Update the incident status and timestamps
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === "resolved") {
      updateData.resolvedAt = now;
    } else if (status === "mitigated" || status === "monitoring") {
      updateData.mitigatedAt = now;
    }

    await db
      .update(incidents)
      .set(updateData)
      .where(eq(incidents.id, id));

    return NextResponse.json({ success: true, data: update });
  } catch (error) {
    console.error("Error creating incident update:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create update" },
      { status: 500 }
    );
  }
}

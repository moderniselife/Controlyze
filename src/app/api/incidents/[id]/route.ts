import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);

    if (incident.length === 0) {
      return NextResponse.json(
        { success: false, error: "Incident not found" },
        { status: 404 }
      );
    }

    const formatted = {
      ...incident[0],
      affectedContainers: incident[0].affectedContainers ? JSON.parse(incident[0].affectedContainers) : [],
      affectedStacks: incident[0].affectedStacks ? JSON.parse(incident[0].affectedStacks) : [],
      logExcerpts: incident[0].logExcerpts ? JSON.parse(incident[0].logExcerpts) : [],
    };

    return NextResponse.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "mitigated" && !updateData.mitigatedAt) {
        updateData.mitigatedAt = new Date();
      }
      if (body.status === "resolved" && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }
    if (body.affectedContainers !== undefined) updateData.affectedContainers = JSON.stringify(body.affectedContainers);
    if (body.affectedStacks !== undefined) updateData.affectedStacks = JSON.stringify(body.affectedStacks);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.runbook !== undefined) updateData.runbook = body.runbook;
    if (body.logExcerpts !== undefined) updateData.logExcerpts = JSON.stringify(body.logExcerpts);
    if (body.discordThreadId !== undefined) updateData.discordThreadId = body.discordThreadId;

    await db.update(incidents).set(updateData).where(eq(incidents.id, id));

    const updated = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);

    return NextResponse.json({
      success: true,
      data: {
        ...updated[0],
        affectedContainers: updated[0].affectedContainers ? JSON.parse(updated[0].affectedContainers) : [],
        affectedStacks: updated[0].affectedStacks ? JSON.parse(updated[0].affectedStacks) : [],
        logExcerpts: updated[0].logExcerpts ? JSON.parse(updated[0].logExcerpts) : [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incident" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(incidents).where(eq(incidents.id, id));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}

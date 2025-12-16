import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const allIncidents = await db.select().from(incidents).orderBy(desc(incidents.createdAt));
    
    const formatted = allIncidents.map((incident) => {
      // Parse JSON fields safely
      let affectedContainers: string[] = [];
      let affectedStacks: string[] = [];
      let affectedServices: string[] = [];
      let logExcerpts: string | string[] = [];
      
      try {
        affectedContainers = incident.affectedContainers ? JSON.parse(incident.affectedContainers) : [];
      } catch { affectedContainers = []; }
      
      try {
        affectedStacks = incident.affectedStacks ? JSON.parse(incident.affectedStacks) : [];
      } catch { affectedStacks = []; }
      
      try {
        affectedServices = incident.affectedServices ? JSON.parse(incident.affectedServices) : [];
      } catch { affectedServices = []; }
      
      // logExcerpts can be either a JSON array or a plain string
      if (incident.logExcerpts) {
        try {
          logExcerpts = JSON.parse(incident.logExcerpts);
        } catch {
          // It's a plain string, keep it as-is
          logExcerpts = incident.logExcerpts;
        }
      }
      
      return {
        ...incident,
        affectedContainers,
        affectedStacks,
        affectedServices,
        logExcerpts,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newIncident = {
      id: nanoid(),
      title: body.title,
      description: body.description || null,
      severity: body.severity || "medium",
      status: body.status || "open",
      affectedContainers: body.affectedContainers ? JSON.stringify(body.affectedContainers) : null,
      affectedStacks: body.affectedStacks ? JSON.stringify(body.affectedStacks) : null,
      notes: body.notes || null,
      runbook: body.runbook || null,
      logExcerpts: body.logExcerpts ? JSON.stringify(body.logExcerpts) : null,
      discordThreadId: body.discordThreadId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(incidents).values(newIncident);

    return NextResponse.json({
      success: true,
      data: {
        ...newIncident,
        affectedContainers: body.affectedContainers || [],
        affectedStacks: body.affectedStacks || [],
        logExcerpts: body.logExcerpts || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create incident" },
      { status: 500 }
    );
  }
}

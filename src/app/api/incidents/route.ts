import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const statusFilter = searchParams.get("status") || "all";
    const severityFilter = searchParams.get("severity") || "all";
    
    // Build where conditions
    const conditions = [];
    if (statusFilter !== "all") {
      conditions.push(eq(incidents.status, statusFilter));
    }
    if (severityFilter !== "all") {
      conditions.push(eq(incidents.severity, severityFilter));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count || 0);
    
    // Get paginated results
    const offset = (page - 1) * limit;
    const query = db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.createdAt))
      .limit(limit)
      .offset(offset);
    
    const allIncidents = whereClause 
      ? await query.where(whereClause)
      : await query;
    
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
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
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
      isPublic: body.isPublic === true,
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

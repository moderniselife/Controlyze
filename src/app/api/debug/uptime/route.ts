import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uptimeRecords } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

// Debug endpoint to check uptime data in database
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(uptimeRecords);
    
    // Get latest 20 records
    const latestRecords = await db
      .select()
      .from(uptimeRecords)
      .orderBy(desc(uptimeRecords.checkedAt))
      .limit(20);
    
    // Get date range
    const dateRange = await db
      .select({
        earliest: sql<string>`min(checked_at)`,
        latest: sql<string>`max(checked_at)`,
      })
      .from(uptimeRecords);
    
    // Get records per day for last 7 days
    const dailyCounts = await db
      .select({
        date: sql<string>`date(checked_at / 1000, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(uptimeRecords)
      .groupBy(sql`date(checked_at / 1000, 'unixepoch')`)
      .orderBy(desc(sql`date(checked_at / 1000, 'unixepoch')`))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        totalRecords: countResult[0]?.count || 0,
        dateRange: {
          earliest: dateRange[0]?.earliest 
            ? new Date(Number(dateRange[0].earliest)).toISOString() 
            : null,
          latest: dateRange[0]?.latest 
            ? new Date(Number(dateRange[0].latest)).toISOString() 
            : null,
        },
        dailyCounts,
        latestRecords: latestRecords.map(r => ({
          ...r,
          checkedAt: r.checkedAt?.toISOString(),
        })),
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in debug uptime:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

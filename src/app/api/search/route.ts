import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { containers, stacks, alerts, incidents, dockerEvents } from "@/lib/db/schema";
import { like, or, desc } from "drizzle-orm";
import { loadRawConfig } from "@/lib/config";

interface SearchResult {
  type: "container" | "stack" | "alert" | "incident" | "event" | "setting" | "integration" | "page";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

const pages = [
  { id: "overview", title: "Overview", url: "/", keywords: ["home", "dashboard"] },
  { id: "stacks", title: "Stacks", url: "/stacks", keywords: ["compose", "projects"] },
  { id: "containers", title: "Containers", url: "/containers", keywords: ["docker", "services"] },
  { id: "logs", title: "Logs", url: "/logs", keywords: ["output", "stdout", "stderr"] },
  { id: "metrics", title: "Metrics", url: "/metrics", keywords: ["cpu", "memory", "performance"] },
  { id: "events", title: "Events", url: "/events", keywords: ["activity", "history"] },
  { id: "alerts", title: "Alerts", url: "/alerts", keywords: ["rules", "notifications"] },
  { id: "incidents", title: "Incidents", url: "/incidents", keywords: ["issues", "problems"] },
  { id: "integrations", title: "Integrations", url: "/integrations", keywords: ["discord", "linear", "webhook"] },
  { id: "settings", title: "Settings", url: "/settings", keywords: ["config", "preferences"] },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results: SearchResult[] = [];

    // Search pages
    const matchingPages = pages.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.keywords.some((k) => k.includes(query))
    );
    matchingPages.forEach((p) => {
      results.push({
        type: "page",
        id: p.id,
        title: p.title,
        subtitle: "Page",
        url: p.url,
      });
    });

    // Search containers
    try {
      const containerResults = await db
        .select()
        .from(containers)
        .where(
          or(
            like(containers.name, `%${query}%`),
            like(containers.image, `%${query}%`),
            like(containers.stackName, `%${query}%`)
          )
        )
        .limit(5);

      containerResults.forEach((c) => {
        results.push({
          type: "container",
          id: c.id,
          title: c.name,
          subtitle: `${c.image} • ${c.state}`,
          url: `/containers/${c.id}`,
        });
      });
    } catch (e) {
      console.error("Error searching containers:", e);
    }

    // Search stacks
    try {
      const stackResults = await db
        .select()
        .from(stacks)
        .where(like(stacks.name, `%${query}%`))
        .limit(5);

      stackResults.forEach((s) => {
        results.push({
          type: "stack",
          id: s.id,
          title: s.name,
          subtitle: `${s.serviceCount} services`,
          url: `/stacks/${s.name}`,
        });
      });
    } catch (e) {
      console.error("Error searching stacks:", e);
    }

    // Search alerts
    try {
      const alertResults = await db
        .select()
        .from(alerts)
        .where(
          or(
            like(alerts.name, `%${query}%`),
            like(alerts.description, `%${query}%`)
          )
        )
        .limit(5);

      alertResults.forEach((a) => {
        results.push({
          type: "alert",
          id: a.id,
          title: a.name,
          subtitle: `${a.severity} • ${a.enabled ? "enabled" : "disabled"}`,
          url: "/alerts",
        });
      });
    } catch (e) {
      console.error("Error searching alerts:", e);
    }

    // Search incidents
    try {
      const incidentResults = await db
        .select()
        .from(incidents)
        .where(
          or(
            like(incidents.title, `%${query}%`),
            like(incidents.description, `%${query}%`)
          )
        )
        .limit(5);

      incidentResults.forEach((i) => {
        results.push({
          type: "incident",
          id: i.id,
          title: i.title,
          subtitle: `${i.status} • ${i.severity}`,
          url: "/incidents",
        });
      });
    } catch (e) {
      console.error("Error searching incidents:", e);
    }

    // Search config/integrations
    try {
      const config = loadRawConfig();
      
      if ("discord".includes(query) && config.discord) {
        results.push({
          type: "integration",
          id: "discord",
          title: "Discord Integration",
          subtitle: config.discord.enabled ? "Enabled" : "Disabled",
          url: "/integrations",
        });
      }
      
      if ("linear".includes(query) && config.ticketing?.provider === "linear") {
        results.push({
          type: "integration",
          id: "linear",
          title: "Linear Integration",
          subtitle: "Ticketing",
          url: "/integrations",
        });
      }

      if ("auth".includes(query) || "login".includes(query)) {
        results.push({
          type: "setting",
          id: "auth",
          title: "Authentication Settings",
          subtitle: config.auth?.enabled ? "Enabled" : "Disabled",
          url: "/settings",
        });
      }
    } catch (e) {
      console.error("Error searching config:", e);
    }

    return NextResponse.json({
      success: true,
      data: results.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}

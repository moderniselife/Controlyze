import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";
import { listContainers } from "@/lib/docker/containers";

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  plex: "Media Server",
  overseerr: "Request Portal",
  tautulli: "Analytics",
  tunarr: "Live TV",
  threadfin: "Live TV/DVR",
  prowlarr: "Indexer Manager",
  schrodrive: "Automation Engine",
  "cloudflare-tunnel": "Network Gateway",
  flaresolverr: "Captcha Solver",
  watchtower: "Auto Updates",
  sonarr: "TV Shows",
  radarr: "Movies",
  lidarr: "Music",
  jellyfin: "Media Server",
  portainer: "Container Management",
};

const SERVICE_GROUPS: Record<string, string> = {
  plex: "Media",
  overseerr: "Media",
  tautulli: "Media",
  tunarr: "Media",
  threadfin: "Media",
  prowlarr: "Indexing",
  sonarr: "Indexing",
  radarr: "Indexing",
  lidarr: "Indexing",
  schrodrive: "Automation",
  watchtower: "Automation",
  "cloudflare-tunnel": "Infrastructure",
  flaresolverr: "Infrastructure",
  jellyfin: "Media",
  portainer: "Infrastructure",
};

const DEFAULT_IMPACT: Record<string, "critical" | "major" | "minor"> = {
  plex: "critical",
  jellyfin: "critical",
  overseerr: "major",
  "cloudflare-tunnel": "critical",
  prowlarr: "major",
  sonarr: "major",
  radarr: "major",
  tautulli: "minor",
  tunarr: "minor",
  threadfin: "minor",
  watchtower: "minor",
  schrodrive: "minor",
  flaresolverr: "minor",
};

export async function GET() {
  try {
    const config = loadRawConfig();
    
    // Get current containers to auto-detect services
    const containers = await listContainers(true);
    const detectedServices = new Set<string>();
    
    for (const container of containers) {
      const serviceName = (container.serviceName || container.name).toLowerCase();
      for (const knownService of Object.keys(SERVICE_DISPLAY_NAMES)) {
        if (serviceName.includes(knownService)) {
          detectedServices.add(knownService);
        }
      }
    }

    // Merge with saved config
    const savedServices = config.statusPage?.services || [];
    const services = Array.from(detectedServices).map((name) => {
      const saved = savedServices.find((s: any) => s.name === name);
      return {
        name,
        displayName: saved?.displayName || SERVICE_DISPLAY_NAMES[name] || name,
        group: saved?.group || SERVICE_GROUPS[name] || "Other",
        enabled: saved?.enabled ?? true,
        impact: saved?.impact || DEFAULT_IMPACT[name] || "major",
      };
    });

    // Sort by group then name
    services.sort((a, b) => {
      const groupOrder = ["Media", "Indexing", "Automation", "Infrastructure", "Other"];
      const groupDiff = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
      if (groupDiff !== 0) return groupDiff;
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.statusPage?.enabled ?? true,
        title: config.statusPage?.title || "System Status",
        services,
      },
    });
  } catch (error) {
    console.error("Error fetching status config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch status config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = loadRawConfig();

    config.statusPage = {
      enabled: body.enabled ?? true,
      title: body.title || "System Status",
      services: body.services || [],
    };

    saveRawConfig(config);
    resetConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving status config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save status config" },
      { status: 500 }
    );
  }
}

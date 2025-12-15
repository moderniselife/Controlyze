import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";
import { listContainers } from "@/lib/docker/containers";

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  plex: "Media Server",
  jellyfin: "Media Server",
  emby: "Media Server",
  overseerr: "Request Portal",
  tautulli: "Analytics",
  tunarr: "Live TV",
  threadfin: "Live TV/DVR",
  prowlarr: "Indexer Manager",
  sonarr: "TV Shows",
  radarr: "Movies",
  lidarr: "Music",
  readarr: "Books",
  bazarr: "Subtitles",
  schrodrive: "Automation Engine",
  watchtower: "Auto Updates",
  "cloudflare-tunnel": "Network Gateway",
  flaresolverr: "Captcha Solver",
  portainer: "Container Management",
  controlyze: "Container Management",
  traefik: "Reverse Proxy",
  nginx: "Web Server",
  pd_zurg: "Cloud Storage",
};

const SERVICE_GROUPS: Record<string, string> = {
  plex: "Media",
  jellyfin: "Media",
  emby: "Media",
  overseerr: "Media",
  tautulli: "Media",
  tunarr: "Media",
  threadfin: "Media",
  prowlarr: "Indexing",
  sonarr: "Indexing",
  radarr: "Indexing",
  lidarr: "Indexing",
  readarr: "Indexing",
  bazarr: "Indexing",
  schrodrive: "Automation",
  watchtower: "Automation",
  "cloudflare-tunnel": "Infrastructure",
  flaresolverr: "Infrastructure",
  portainer: "Infrastructure",
  controlyze: "Infrastructure",
  traefik: "Infrastructure",
  nginx: "Infrastructure",
  pd_zurg: "Storage",
};

const DEFAULT_IMPACT: Record<string, "critical" | "major" | "minor"> = {
  plex: "critical",
  jellyfin: "critical",
  emby: "critical",
  overseerr: "major",
  "cloudflare-tunnel": "critical",
  prowlarr: "major",
  sonarr: "major",
  radarr: "major",
  lidarr: "major",
  readarr: "minor",
  bazarr: "minor",
  tautulli: "minor",
  tunarr: "minor",
  threadfin: "minor",
  watchtower: "minor",
  schrodrive: "minor",
  flaresolverr: "minor",
  portainer: "minor",
  controlyze: "minor",
  traefik: "critical",
  nginx: "major",
  pd_zurg: "major",
};

export async function GET() {
  try {
    const config = loadRawConfig();
    
    // Get current containers to auto-detect services
    const containers = await listContainers(true);
    const serviceContainerMap = new Map<string, { id: string; name: string; state: string; healthStatus?: string }[]>();
    
    for (const container of containers) {
      const serviceName = (container.serviceName || container.name).toLowerCase();
      for (const knownService of Object.keys(SERVICE_DISPLAY_NAMES)) {
        if (serviceName.includes(knownService)) {
          if (!serviceContainerMap.has(knownService)) {
            serviceContainerMap.set(knownService, []);
          }
          serviceContainerMap.get(knownService)!.push({
            id: container.id,
            name: container.name,
            state: container.state,
            healthStatus: container.healthStatus,
          });
        }
      }
    }

    // Merge with saved config
    const savedServices = config.statusPage?.services || [];
    const services = Array.from(serviceContainerMap.keys()).map((name) => {
      const saved = savedServices.find((s: any) => s.name === name);
      return {
        name,
        displayName: saved?.displayName || SERVICE_DISPLAY_NAMES[name] || name,
        group: saved?.group || SERVICE_GROUPS[name] || "Other",
        enabled: saved?.enabled ?? true,
        impact: saved?.impact || DEFAULT_IMPACT[name] || "major",
        containers: serviceContainerMap.get(name) || [],
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

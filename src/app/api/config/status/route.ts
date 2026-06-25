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

function normalizeStatusDomain(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const domain = value.trim().toLowerCase();
  if (!domain) {
    return "";
  }

  if (
    domain.length > 253 ||
    domain.includes("/") ||
    domain.includes(":") ||
    domain === "localhost" ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)
  ) {
    throw new Error("Invalid status page domain");
  }

  return domain;
}

export async function GET() {
  try {
    const config = loadRawConfig();
    
    // Get ALL containers from Docker
    const containers = await listContainers(true);
    const savedServices = config.statusPage?.services || [];
    const savedContainers = config.statusPage?.containers || {};
    
    // Build a map of container ID/name -> service assignment from saved config
    const containerToService = new Map<string, string>();
    for (const service of savedServices) {
      for (const container of service.containers || []) {
        containerToService.set(container.id, service.name);
        containerToService.set(container.name, service.name);
      }
    }
    
    // Build services from saved config, enriched with live container data
    const serviceMap = new Map<string, {
      name: string;
      displayName: string;
      group: string;
      enabled: boolean;
      impact: "critical" | "major" | "minor";
      containers: { id: string; name: string; state: string; healthStatus?: string; enabled: boolean; impact: "critical" | "major" | "minor" }[];
    }>();
    
    // Initialize from saved services
    for (const saved of savedServices) {
      serviceMap.set(saved.name, {
        name: saved.name,
        displayName: saved.displayName || SERVICE_DISPLAY_NAMES[saved.name] || saved.name,
        group: saved.group || SERVICE_GROUPS[saved.name] || "Other",
        enabled: saved.enabled ?? true,
        impact: saved.impact || DEFAULT_IMPACT[saved.name] || "major",
        containers: [],
      });
    }
    
    // All containers with their current state
    const allContainers = containers.map((c) => {
      const containerConfig = savedContainers[c.id] || savedContainers[c.name] || {};
      const assignedService = containerToService.get(c.id) || containerToService.get(c.name);
      
      return {
        id: c.id,
        name: c.name,
        state: c.state,
        healthStatus: c.healthStatus,
        enabled: containerConfig.enabled ?? true,
        impact: containerConfig.impact || "major" as const,
        serviceName: assignedService || null,
      };
    });
    
    // Add containers to their assigned services
    for (const container of allContainers) {
      if (container.serviceName && serviceMap.has(container.serviceName)) {
        serviceMap.get(container.serviceName)!.containers.push({
          id: container.id,
          name: container.name,
          state: container.state,
          healthStatus: container.healthStatus,
          enabled: container.enabled,
          impact: container.impact,
        });
      }
    }
    
    // Auto-detect services for unassigned containers based on known names
    for (const container of allContainers) {
      if (container.serviceName) continue; // Already assigned
      
      const containerNameLower = container.name.toLowerCase();
      let matchedService: string | null = null;
      
      for (const knownService of Object.keys(SERVICE_DISPLAY_NAMES)) {
        if (containerNameLower.includes(knownService)) {
          matchedService = knownService;
          break;
        }
      }
      
      if (matchedService) {
        if (!serviceMap.has(matchedService)) {
          serviceMap.set(matchedService, {
            name: matchedService,
            displayName: SERVICE_DISPLAY_NAMES[matchedService] || matchedService,
            group: SERVICE_GROUPS[matchedService] || "Other",
            enabled: true,
            impact: DEFAULT_IMPACT[matchedService] || "major",
            containers: [],
          });
        }
        serviceMap.get(matchedService)!.containers.push({
          id: container.id,
          name: container.name,
          state: container.state,
          healthStatus: container.healthStatus,
          enabled: container.enabled,
          impact: container.impact,
        });
      }
    }
    
    // Convert to array and sort
    const services = Array.from(serviceMap.values());
    services.sort((a, b) => {
      const groupOrder = ["Media", "Indexing", "Automation", "Infrastructure", "Storage", "Other"];
      const groupDiff = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
      if (groupDiff !== 0) return groupDiff;
      return a.displayName.localeCompare(b.displayName);
    });
    
    // Get unassigned containers - those not explicitly in SAVED services
    // (auto-detected services don't count - user should be able to reassign those)
    const savedContainerIds = new Set<string>();
    for (const saved of savedServices) {
      for (const c of saved.containers || []) {
        savedContainerIds.add(c.id);
      }
    }
    const unassignedContainers = allContainers
      .filter((c) => !savedContainerIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        state: c.state,
        healthStatus: c.healthStatus,
        enabled: c.enabled,
        impact: c.impact,
      }));

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.statusPage?.enabled ?? true,
        title: config.statusPage?.title || "System Status",
        domain: config.statusPage?.domain || "",
        services,
        unassignedContainers,
        containers: savedContainers,
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

    const domain = normalizeStatusDomain(body.domain);

    config.statusPage = {
      enabled: body.enabled ?? true,
      title: body.title || "System Status",
      domain,
      services: body.services || [],
      containers: body.containers || {},
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

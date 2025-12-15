import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker/containers";
import { listStacks } from "@/lib/docker/stacks";
import { loadConfig } from "@/lib/config";
import { getUptimeStats, recordUptimeCheck } from "@/lib/uptime/tracker";

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  healthStatus?: string;
}

export interface PublicServiceStatus {
  name: string;
  displayName: string;
  status: "operational" | "degraded" | "down" | "maintenance";
  group: string;
  icon?: string;
  containers: ContainerInfo[];
}

export interface PublicStatusResponse {
  overall: "operational" | "degraded" | "down" | "maintenance";
  lastUpdated: string;
  services: PublicServiceStatus[];
  incidents: PublicIncident[];
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export interface PublicIncident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  plex: "Media Server",
  overseerr: "Request Portal",
  tautulli: "Analytics",
  tunarr: "Live TV",
  prowlarr: "Indexer Manager",
  schrodrive: "Automation Engine",
  "cloudflare-tunnel": "Network Gateway",
  "flaresolverr-lb": "Captcha Resolver",
  flaresolverr: "Captcha Solver",
  watchtower: "Auto Updates",
  pd_zurg: "Cloud Storage",
  sonarr: "TV Shows",
  radarr: "Movies",
  lidarr: "Music",
  readarr: "Books",
  bazarr: "Subtitles",
  jellyfin: "Media Server",
  emby: "Media Server",
  portainer: "Container Management",
  traefik: "Reverse Proxy",
  nginx: "Web Server",
  pihole: "Ad Blocking",
  homeassistant: "Home Automation",
  grafana: "Monitoring",
  prometheus: "Metrics",
};

const SERVICE_ICONS: Record<string, string> = {
  plex: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/plex.svg",
  overseerr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/overseerr.svg",
  tautulli: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/tautulli.svg",
  tunarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/tunarr.svg",
  prowlarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/prowlarr.svg",
  sonarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sonarr.svg",
  radarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/radarr.svg",
  lidarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/lidarr.svg",
  readarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/readarr.svg",
  bazarr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/bazarr.svg",
  jellyfin: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/jellyfin.svg",
  emby: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/emby.svg",
  portainer: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/portainer.svg",
  traefik: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/traefik.svg",
  nginx: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/nginx.svg",
  pihole: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/pi-hole.svg",
  homeassistant: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/home-assistant.svg",
  grafana: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/grafana.svg",
  prometheus: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/prometheus.svg",
  cloudflare: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/cloudflare.svg",
  "cloudflare-tunnel": "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/cloudflare.svg",
  watchtower: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/watchtower.svg",
  flaresolverr: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/flaresolverr.svg",
};

const SERVICE_GROUPS: Record<string, string> = {
  plex: "Media",
  overseerr: "Media",
  tautulli: "Media",
  tunarr: "Media",
  prowlarr: "Indexing",
  schrodrive: "Automation",
  "cloudflare-tunnel": "Infrastructure",
  "flaresolverr-lb": "Infrastructure",
  pd_zurg: "Storage",
  watchtower: "Maintenance",
};

const PUBLIC_SERVICES = [
  "plex",
  "overseerr",
  "tautulli",
  "tunarr",
  "prowlarr",
  "schrodrive",
  "cloudflare-tunnel",
];

function getServiceStatus(
  state: string,
  healthStatus?: string
): PublicServiceStatus["status"] {
  if (state !== "running") return "down";
  if (healthStatus === "unhealthy") return "degraded";
  return "operational";
}

function getOverallStatus(
  services: PublicServiceStatus[]
): PublicStatusResponse["overall"] {
  const hasDown = services.some((s) => s.status === "down");
  const hasDegraded = services.some((s) => s.status === "degraded");

  if (hasDown) return "down";
  if (hasDegraded) return "degraded";
  return "operational";
}

export async function GET() {
  try {
    const containers = await listContainers(true);

    const serviceMap = new Map<string, PublicServiceStatus>();

    for (const container of containers) {
      const serviceName = container.serviceName || container.name;
      const lowerName = serviceName.toLowerCase();

      if (
        PUBLIC_SERVICES.some(
          (ps) => lowerName.includes(ps) || lowerName === ps
        )
      ) {
        const matchedService =
          PUBLIC_SERVICES.find(
            (ps) => lowerName.includes(ps) || lowerName === ps
          ) || serviceName;

        const containerInfo: ContainerInfo = {
          id: container.id,
          name: container.name,
          status: container.status,
          state: container.state,
          healthStatus: container.healthStatus,
        };

        if (serviceMap.has(matchedService)) {
          serviceMap.get(matchedService)!.containers.push(containerInfo);
          // Update status if this container is worse
          const currentStatus = serviceMap.get(matchedService)!.status;
          const newStatus = getServiceStatus(container.state, container.healthStatus);
          if (newStatus === "down" || (newStatus === "degraded" && currentStatus === "operational")) {
            serviceMap.get(matchedService)!.status = newStatus;
          }
        } else {
          serviceMap.set(matchedService, {
            name: matchedService,
            displayName:
              SERVICE_DISPLAY_NAMES[matchedService] ||
              serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
            status: getServiceStatus(container.state, container.healthStatus),
            group: SERVICE_GROUPS[matchedService] || "Other",
            icon: SERVICE_ICONS[matchedService],
            containers: [containerInfo],
          });
        }
      }
    }

    const services = Array.from(serviceMap.values());

    services.sort((a, b) => {
      const groupOrder = ["Media", "Indexing", "Automation", "Infrastructure"];
      return (
        groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) ||
        a.displayName.localeCompare(b.displayName)
      );
    });

    const mockIncidents: PublicIncident[] = [];

    // Record this check and get real uptime stats
    await recordUptimeCheck();
    const uptime = await getUptimeStats();

    const response: PublicStatusResponse = {
      overall: getOverallStatus(services),
      lastUpdated: new Date().toISOString(),
      services,
      incidents: mockIncidents,
      uptime,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error getting public status:", error);
    return NextResponse.json(
      {
        overall: "down",
        lastUpdated: new Date().toISOString(),
        services: [],
        incidents: [],
        uptime: { last24h: 0, last7d: 0, last30d: 0 },
        error: "Unable to fetch status",
      },
      { status: 500 }
    );
  }
}

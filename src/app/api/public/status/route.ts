import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker/containers";
import { listStacks } from "@/lib/docker/stacks";
import { loadConfig } from "@/lib/config";

export interface PublicServiceStatus {
  name: string;
  displayName: string;
  status: "operational" | "degraded" | "down" | "maintenance";
  group: string;
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

    const services: PublicServiceStatus[] = [];

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

        if (!services.find((s) => s.name === matchedService)) {
          services.push({
            name: matchedService,
            displayName:
              SERVICE_DISPLAY_NAMES[matchedService] ||
              serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
            status: getServiceStatus(container.state, container.healthStatus),
            group: SERVICE_GROUPS[matchedService] || "Other",
          });
        }
      }
    }

    services.sort((a, b) => {
      const groupOrder = ["Media", "Indexing", "Automation", "Infrastructure"];
      return (
        groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) ||
        a.displayName.localeCompare(b.displayName)
      );
    });

    const mockIncidents: PublicIncident[] = [];

    const response: PublicStatusResponse = {
      overall: getOverallStatus(services),
      lastUpdated: new Date().toISOString(),
      services,
      incidents: mockIncidents,
      uptime: {
        last24h: 99.9,
        last7d: 99.8,
        last30d: 99.5,
      },
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

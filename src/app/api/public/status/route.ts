import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker/containers";
import { getOverallUptime } from "@/lib/uptime/tracker";
import { loadRawConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { incidents, uptimeRecords, incidentUpdates } from "@/lib/db/schema";
import { desc, gte, asc, eq, and } from "drizzle-orm";
import { recordUptime, determineServiceStatus } from "@/lib/uptime/recorder";

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
    trackingSince: string | null;
  };
}

export interface PublicIncidentUpdate {
  id: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface PublicIncident {
  id: string;
  title: string;
  description?: string;
  status: "open" | "investigating" | "identified" | "monitoring" | "mitigated" | "resolved";
  severity: "minor" | "major" | "critical";
  affectedServices?: string[];
  logExcerpts?: string;
  updates: PublicIncidentUpdate[];
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
  controlyze: "Container Management",
  threadfin: "Live TV/DVR",
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
  controlyze: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/docker.svg",
  threadfin: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/threadfin.svg",
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
  "flaresolverr-lb": "Infrastructure",
  controlyze: "Infrastructure",
  portainer: "Infrastructure",
  traefik: "Infrastructure",
  nginx: "Infrastructure",
  pd_zurg: "Storage",
};

function getServiceStatus(
  state: string,
  healthStatus?: string
): PublicServiceStatus["status"] {
  if (state !== "running") return "down";
  if (healthStatus === "unhealthy") return "degraded";
  return "operational";
}

function getOverallStatus(
  services: PublicServiceStatus[],
  serviceConfigs: Record<string, { enabled: boolean; impact: string }>
): PublicStatusResponse["overall"] {
  // Only consider enabled services with their impact levels
  const criticalDown = services.some((s) => {
    const cfg = serviceConfigs[s.name];
    return s.status === "down" && (!cfg || cfg.enabled) && cfg?.impact === "critical";
  });
  const majorDown = services.some((s) => {
    const cfg = serviceConfigs[s.name];
    return s.status === "down" && (!cfg || cfg.enabled) && cfg?.impact === "major";
  });
  const criticalDegraded = services.some((s) => {
    const cfg = serviceConfigs[s.name];
    return s.status === "degraded" && (!cfg || cfg.enabled) && cfg?.impact === "critical";
  });

  if (criticalDown) return "down";
  if (majorDown || criticalDegraded) return "degraded";
  return "operational";
}

export async function GET() {
  try {
    const containers = await listContainers(true);
    const config = loadRawConfig();
    
    // Build service config map from saved settings
    const serviceConfigs: Record<string, { enabled: boolean; impact: string }> = {};
    for (const svc of config.statusPage?.services || []) {
      serviceConfigs[svc.name] = { enabled: svc.enabled ?? true, impact: svc.impact || "major" };
    }

    const serviceMap = new Map<string, PublicServiceStatus>();

    // Get list of known services from display names
    const knownServices = Object.keys(SERVICE_DISPLAY_NAMES);

    // Get per-container settings
    const containerConfigs = config.statusPage?.containers || {};

    for (const container of containers) {
      const serviceName = container.serviceName || container.name;
      const lowerName = serviceName.toLowerCase();

      // Match against known services
      const matchedService = knownServices.find(
        (ks) => lowerName.includes(ks) || lowerName === ks
      );

      if (matchedService) {
        // Check if this service is enabled in config (default to enabled)
        const svcConfig = serviceConfigs[matchedService];
        if (svcConfig && !svcConfig.enabled) {
          continue; // Skip disabled services
        }

        // Check if this specific container is enabled (default to enabled)
        const containerConfig = containerConfigs[container.id] || containerConfigs[container.name];
        if (containerConfig && !containerConfig.enabled) {
          continue; // Skip disabled containers
        }

        const containerInfo: ContainerInfo = {
          id: container.id,
          name: container.name,
          status: container.status,
          state: container.state,
          healthStatus: container.healthStatus,
        };

        if (serviceMap.has(matchedService)) {
          serviceMap.get(matchedService)!.containers.push(containerInfo);
          // Update status if this container is worse (only if container is enabled)
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

    // Record uptime for each service (throttled to once per minute via database check)
    try {
      const uptimeChecks = services.map((svc) => ({
        serviceName: svc.name,
        status: determineServiceStatus(
          svc.containers.map((c) => ({ state: c.state, healthStatus: c.healthStatus }))
        ),
      }));
      await recordUptime(uptimeChecks);
    } catch (err) {
      console.error("Failed to record uptime:", err);
    }

    // Fetch real uptime data
    const [uptime24h, uptime7d, uptime30d] = await Promise.all([
      getOverallUptime(24),
      getOverallUptime(24 * 7),
      getOverallUptime(24 * 30),
    ]);

    // Fetch recent incidents from database (only public ones)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIncidents = await db
      .select()
      .from(incidents)
      .where(
        and(
          gte(incidents.createdAt, sevenDaysAgo),
          eq(incidents.isPublic, true)
        )
      )
      .orderBy(desc(incidents.createdAt))
      .limit(10);

    // Fetch updates for each incident
    const publicIncidents: PublicIncident[] = await Promise.all(
      recentIncidents.map(async (inc) => {
        const updates = await db
          .select()
          .from(incidentUpdates)
          .where(
            and(
              eq(incidentUpdates.incidentId, inc.id),
              eq(incidentUpdates.isPublic, true)
            )
          )
          .orderBy(desc(incidentUpdates.createdAt));

        const mapStatus = (s: string): PublicIncident["status"] => {
          if (s === "resolved") return "resolved";
          if (s === "mitigated") return "mitigated";
          if (s === "monitoring") return "monitoring";
          if (s === "identified") return "identified";
          if (s === "investigating") return "investigating";
          return "open";
        };

        return {
          id: inc.id,
          title: inc.title,
          description: inc.description || undefined,
          status: mapStatus(inc.status),
          severity: inc.severity === "critical" ? "critical" as const : inc.severity === "high" ? "major" as const : "minor" as const,
          affectedServices: inc.affectedServices ? JSON.parse(inc.affectedServices) : undefined,
          logExcerpts: inc.logExcerpts || undefined,
          updates: updates.map((u) => ({
            id: u.id,
            status: u.status,
            message: u.message,
            createdAt: u.createdAt.toISOString(),
          })),
          createdAt: inc.createdAt.toISOString(),
          updatedAt: inc.updatedAt.toISOString(),
          resolvedAt: inc.resolvedAt?.toISOString(),
        };
      })
    );

    // Get earliest uptime record to show "tracking since"
    const earliestRecord = await db
      .select({ checkedAt: uptimeRecords.checkedAt })
      .from(uptimeRecords)
      .orderBy(asc(uptimeRecords.checkedAt))
      .limit(1);
    
    const trackingSince = earliestRecord.length > 0 
      ? earliestRecord[0].checkedAt.toISOString() 
      : null;

    const response = {
      overall: getOverallStatus(services, serviceConfigs),
      lastUpdated: new Date().toISOString(),
      services,
      incidents: publicIncidents,
      uptime: {
        last24h: uptime24h,
        last7d: uptime7d,
        last30d: uptime30d,
        trackingSince,
      },
      config: {
        enabled: config.statusPage?.enabled ?? true,
        title: config.statusPage?.title || "System Status",
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
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

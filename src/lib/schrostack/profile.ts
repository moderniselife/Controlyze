import { existsSync } from "fs";
import { resolve } from "path";
import { listStacks, type StackInfo } from "@/lib/docker/stacks";

export interface SchroStackProfile {
  detected: boolean;
  composeFile?: string;
  services: {
    media: string[];
    indexers: string[];
    automation: string[];
    infrastructure: string[];
  };
  alerts: SchroStackAlert[];
}

export interface SchroStackAlert {
  name: string;
  description: string;
  condition: {
    type: string;
    services?: string[];
    threshold?: number;
    pattern?: string;
  };
  severity: "info" | "warning" | "critical";
}

const SCHROSTACK_SERVICES = {
  media: ["plex", "tunarr", "overseerr", "tautulli"],
  indexers: ["prowlarr", "flaresolverr", "flaresolverr-lb"],
  automation: ["schrodrive", "watchtower", "pd_zurg", "torbox-media-center"],
  infrastructure: ["cloudflare-tunnel"],
};

const SCHROSTACK_COMPOSE_PATTERNS = [
  "docker-SchroStack.yml",
  "docker-schrostack.yml",
  "schrostack.yml",
];

const SCHROSTACK_ALERTS: SchroStackAlert[] = [
  {
    name: "Plex Unhealthy",
    description: "Alert when Plex media server becomes unhealthy",
    condition: {
      type: "health_status",
      services: ["plex"],
    },
    severity: "critical",
  },
  {
    name: "Media Stack Down",
    description: "Alert when core media services are down",
    condition: {
      type: "container_status",
      services: ["plex", "overseerr"],
    },
    severity: "critical",
  },
  {
    name: "Indexer Issues",
    description: "Alert when indexer services have problems",
    condition: {
      type: "health_status",
      services: ["prowlarr", "flaresolverr"],
    },
    severity: "warning",
  },
  {
    name: "High Memory on Transcoder",
    description: "Alert when Plex/Tunarr memory usage is high",
    condition: {
      type: "resource_threshold",
      services: ["plex", "tunarr"],
      threshold: 85,
    },
    severity: "warning",
  },
  {
    name: "Zurg Mount Failed",
    description: "Alert when pd_zurg fails healthcheck",
    condition: {
      type: "health_status",
      services: ["pd_zurg"],
    },
    severity: "critical",
  },
  {
    name: "SchroDrive Errors",
    description: "Monitor SchroDrive logs for errors",
    condition: {
      type: "log_pattern",
      services: ["schrodrive"],
      pattern: "(?i)(error|failed|exception)",
    },
    severity: "warning",
  },
];

export async function detectSchroStack(): Promise<SchroStackProfile> {
  const stacks = await listStacks();

  for (const stack of stacks) {
    if (isSchroStackStack(stack)) {
      return {
        detected: true,
        services: categorizeServices(stack),
        alerts: SCHROSTACK_ALERTS,
      };
    }
  }

  for (const pattern of SCHROSTACK_COMPOSE_PATTERNS) {
    const paths = [
      resolve(process.cwd(), pattern),
      resolve("/home", pattern),
      resolve("/opt", pattern),
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        return {
          detected: true,
          composeFile: path,
          services: SCHROSTACK_SERVICES,
          alerts: SCHROSTACK_ALERTS,
        };
      }
    }
  }

  return {
    detected: false,
    services: { media: [], indexers: [], automation: [], infrastructure: [] },
    alerts: [],
  };
}

function isSchroStackStack(stack: StackInfo): boolean {
  const serviceNames = stack.services.map((s) => s.name.toLowerCase());

  const schroStackSignatures = [
    ["plex", "overseerr"],
    ["plex", "prowlarr"],
    ["schrodrive"],
    ["pd_zurg"],
  ];

  for (const signature of schroStackSignatures) {
    if (signature.every((s) => serviceNames.includes(s))) {
      return true;
    }
  }

  return false;
}

function categorizeServices(stack: StackInfo): SchroStackProfile["services"] {
  const result = {
    media: [] as string[],
    indexers: [] as string[],
    automation: [] as string[],
    infrastructure: [] as string[],
  };

  for (const service of stack.services) {
    const name = service.name.toLowerCase();

    if (
      SCHROSTACK_SERVICES.media.some((s) =>
        name.includes(s.toLowerCase())
      )
    ) {
      result.media.push(service.name);
    } else if (
      SCHROSTACK_SERVICES.indexers.some((s) =>
        name.includes(s.toLowerCase())
      )
    ) {
      result.indexers.push(service.name);
    } else if (
      SCHROSTACK_SERVICES.automation.some((s) =>
        name.includes(s.toLowerCase())
      )
    ) {
      result.automation.push(service.name);
    } else if (
      SCHROSTACK_SERVICES.infrastructure.some((s) =>
        name.includes(s.toLowerCase())
      )
    ) {
      result.infrastructure.push(service.name);
    }
  }

  return result;
}

export function getSchroStackDashboard(profile: SchroStackProfile) {
  return {
    sections: [
      {
        title: "Media Services",
        description: "Plex, Tunarr, Overseerr, Tautulli",
        services: profile.services.media,
        priority: 1,
      },
      {
        title: "Indexers",
        description: "Prowlarr and FlareSolverr instances",
        services: profile.services.indexers,
        priority: 2,
      },
      {
        title: "Automation",
        description: "SchroDrive, Watchtower, Zurg",
        services: profile.services.automation,
        priority: 3,
      },
      {
        title: "Infrastructure",
        description: "Networking and tunnels",
        services: profile.services.infrastructure,
        priority: 4,
      },
    ],
    quickActions: [
      { label: "Restart Plex", action: "restart", service: "plex" },
      { label: "View Media Logs", action: "logs", service: "plex" },
      { label: "Check Indexers", action: "health", service: "prowlarr" },
      { label: "Zurg Status", action: "status", service: "pd_zurg" },
    ],
  };
}

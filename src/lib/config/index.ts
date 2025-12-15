import { parse, stringify } from "yaml";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { controlyzeConfigSchema, type ControlyzeConfig } from "./schema";

const CONFIG_PATH = process.env.CONFIG_PATH || "./data/controlyze.yml";

function substituteEnvVars(obj: any): any {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteEnvVars);
  }
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVars(value);
    }
    return result;
  }
  return obj;
}
const DEFAULT_CONFIG: ControlyzeConfig = {
  version: "1",
  docker: {
    connection: {
      type: "socket",
      socketPath: "/var/run/docker.sock",
    },
  },
  stacks: {
    detection: {
      enabled: true,
      paths: ["/home/*/docker-*.yml", "/opt/stacks/**/docker-compose.yml"],
    },
    profiles: {
      schrostack: {
        enabled: true,
        composeFile: "docker-SchroStack.yml",
        services: {
          media: ["plex", "tunarr", "overseerr", "tautulli"],
          indexers: ["prowlarr", "flaresolverr*"],
          automation: ["schrodrive", "watchtower", "pd_zurg"],
          infrastructure: ["cloudflare-tunnel", "flaresolverr-lb"],
        },
      },
    },
  },
  alerts: {
    rules: [
      {
        name: "container_unhealthy",
        enabled: true,
        condition: {
          type: "health_status",
          status: "unhealthy",
          duration: "30s",
        },
        severity: "warning",
        routing: { discord: true },
      },
      {
        name: "restart_loop",
        enabled: true,
        condition: {
          type: "restart_count",
          threshold: 3,
          window: "5m",
        },
        severity: "critical",
        routing: { discord: true, autoTicket: true },
      },
      {
        name: "high_memory",
        enabled: true,
        condition: {
          type: "resource_threshold",
          metric: "memory_percent",
          threshold: 90,
          duration: "2m",
        },
        severity: "warning",
      },
    ],
    defaults: {
      cooldown: "5m",
      dedupEnabled: true,
    },
  },
  discord: {
    enabled: false,
  },
  ticketing: {
    provider: "linear",
  },
  logs: {
    retentionDays: 7,
    indexEnabled: true,
    redaction: {
      enabled: true,
      patterns: [
        "(?i)(api[_-]?key|token|secret|password)\\s*[=:]\\s*\\S+",
        "Bearer\\s+[A-Za-z0-9\\-_.]+",
      ],
    },
  },
  ui: {
    theme: "dark",
    defaultView: "overview",
    refreshInterval: "5s",
  },
  auth: {
    enabled: false,
  },
};

let cachedConfig: ControlyzeConfig | null = null;

export function loadConfig(): ControlyzeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = resolve(CONFIG_PATH);

  if (!existsSync(configPath)) {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parse(content);
    const substituted = substituteEnvVars(parsed);
    const result = controlyzeConfigSchema.safeParse(substituted);

    if (result.success) {
      cachedConfig = result.data;
      return cachedConfig;
    } else {
      console.error("Config validation errors:", result.error.issues);
      cachedConfig = DEFAULT_CONFIG;
      return cachedConfig;
    }
  } catch (error) {
    console.error("Error loading config:", error);
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function saveConfig(config: ControlyzeConfig): void {
  const configPath = resolve(CONFIG_PATH);
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const content = stringify(config, { indent: 2 });
  writeFileSync(configPath, content, "utf-8");
  cachedConfig = config;
}

export function loadRawConfig(): Record<string, any> {
  const configPath = resolve(CONFIG_PATH);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return parse(content) || {};
  } catch (error) {
    console.error("Error loading raw config:", error);
    return {};
  }
}

export function saveRawConfig(config: Record<string, any>): void {
  const configPath = resolve(CONFIG_PATH);
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const content = stringify(config, { indent: 2 });
  writeFileSync(configPath, content, "utf-8");
  cachedConfig = null; // Invalidate cache
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export function getDefaultConfig(): ControlyzeConfig {
  return { ...DEFAULT_CONFIG };
}

export function exportConfig(config: ControlyzeConfig): string {
  return stringify(config, { indent: 2 });
}

export function importConfig(content: string): ControlyzeConfig {
  const parsed = parse(content);
  const result = controlyzeConfigSchema.safeParse(parsed);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(`Invalid config: ${result.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
  }
}

export { controlyzeConfigSchema, type ControlyzeConfig } from "./schema";

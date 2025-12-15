"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Zap, ChevronDown, ChevronUp, Box } from "lucide-react";
import Image from "next/image";

interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  healthStatus?: string;
}

interface PublicServiceStatus {
  name: string;
  displayName: string;
  status: "operational" | "degraded" | "down" | "maintenance";
  group: string;
  icon?: string;
  containers: ContainerInfo[];
}

interface PublicIncident {
  id: string;
  title: string;
  status: "open" | "investigating" | "mitigated" | "resolved";
  severity: "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface StatusData {
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
  config?: {
    enabled: boolean;
    title: string;
  };
}

const statusConfig = {
  operational: {
    label: "All Systems Operational",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    icon: CheckCircle2,
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
  degraded: {
    label: "Partial System Outage",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    icon: AlertTriangle,
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
  },
  down: {
    label: "Major System Outage",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    icon: XCircle,
    gradient: "from-red-500/20 via-red-500/5 to-transparent",
  },
  maintenance: {
    label: "Under Maintenance",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    icon: Clock,
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
  },
};

const serviceStatusConfig = {
  operational: {
    color: "bg-emerald-500",
    label: "Operational",
  },
  degraded: {
    color: "bg-amber-500",
    label: "Degraded",
  },
  down: {
    color: "bg-red-500",
    label: "Down",
  },
  maintenance: {
    color: "bg-blue-500",
    label: "Maintenance",
  },
};

export default function PublicStatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const toggleService = (serviceName: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceName)) {
        next.delete(serviceName);
      } else {
        next.add(serviceName);
      }
      return next;
    });
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/public/status");
      const data = await response.json();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const groupedServices = status?.services.reduce(
    (acc, service) => {
      if (!acc[service.group]) {
        acc[service.group] = [];
      }
      acc[service.group].push(service);
      return acc;
    },
    {} as Record<string, PublicServiceStatus[]>
  );

  const overallConfig = status
    ? statusConfig[status.overall]
    : statusConfig.operational;
  const StatusIcon = overallConfig.icon;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30">
      <div
        className={`fixed inset-0 bg-linear-to-b ${overallConfig.gradient} pointer-events-none`}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl scale-150" />
              <Image
                src="/logo.png"
                alt="Logo"
                width={80}
                height={80}
                className="relative rounded-xl drop-shadow-2xl"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-zinc-400">Live Status</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
              {status?.config?.title || "System Status"}
            </span>
          </h1>

          <p className="text-zinc-500 max-w-md mx-auto">
            Real-time status of all services. Updates every 30 seconds.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
            </div>
          </div>
        ) : status?.config?.enabled === false ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-4">
              <XCircle className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-400 mb-2">Status Page Disabled</h2>
            <p className="text-zinc-600">The status page has been disabled by the administrator.</p>
          </div>
        ) : status ? (
          <>
            <div
              className={`relative overflow-hidden rounded-2xl ${overallConfig.bgColor} border ${overallConfig.borderColor} p-8 mb-8`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

              <div className="flex items-center justify-center gap-4">
                <div
                  className={`p-3 rounded-xl ${overallConfig.bgColor} border ${overallConfig.borderColor}`}
                >
                  <StatusIcon className={`h-8 w-8 ${overallConfig.color}`} />
                </div>
                <div className="text-center">
                  <h2
                    className={`text-2xl md:text-3xl font-bold ${overallConfig.color}`}
                  >
                    {overallConfig.label}
                  </h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    Last checked:{" "}
                    {lastRefresh.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "24h", value: status.uptime.last24h },
                { label: "7 days", value: status.uptime.last7d },
                { label: "30 days", value: status.uptime.last30d },
              ].map((period) => (
                <div
                  key={period.label}
                  className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-6 text-center group hover:bg-white/[0.07] transition-colors"
                >
                  <div className="text-3xl font-bold text-white mb-1">
                    {period.value}
                    <span className="text-lg text-zinc-500">%</span>
                  </div>
                  <div className="text-sm text-zinc-500">
                    Uptime ({period.label})
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${period.value}%` }}
                  />
                </div>
              ))}
            </div>

            {status.uptime.trackingSince && (
              <p className="text-center text-xs text-zinc-600 mb-8">
                Tracking since {new Date(status.uptime.trackingSince).toLocaleDateString([], { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            )}

            <div className="space-y-8">
              {groupedServices &&
                Object.entries(groupedServices).map(([group, services]) => (
                  <div key={group}>
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
                      {group}
                    </h3>
                    <div className="space-y-2">
                      {services.map((service) => {
                        const config = serviceStatusConfig[service.status];
                        const isExpanded = expandedServices.has(service.name);
                        const hasContainers = service.containers && service.containers.length > 0;
                        return (
                          <div key={service.name} className="space-y-1">
                            <div
                              onClick={() => hasContainers && toggleService(service.name)}
                              className={`group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all duration-300 ${hasContainers ? "cursor-pointer" : ""}`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${config.color} shadow-lg shadow-current/50`}
                                />
                                {service.icon && (
                                  <img
                                    src={service.icon}
                                    alt={service.displayName}
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="font-medium text-white">
                                  {service.displayName}
                                </span>
                                {hasContainers && (
                                  <span className="text-xs text-zinc-500">
                                    ({service.containers.length} container{service.containers.length !== 1 ? "s" : ""})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-sm ${
                                    service.status === "operational"
                                      ? "text-emerald-400"
                                      : service.status === "degraded"
                                      ? "text-amber-400"
                                      : service.status === "down"
                                      ? "text-red-400"
                                      : "text-blue-400"
                                  }`}
                                >
                                  {config.label}
                                </span>
                                {hasContainers && (
                                  isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                                  )
                                )}
                              </div>

                              <div
                                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-r ${
                                  service.status === "operational"
                                    ? "from-emerald-500/5"
                                    : service.status === "degraded"
                                    ? "from-amber-500/5"
                                    : service.status === "down"
                                    ? "from-red-500/5"
                                    : "from-blue-500/5"
                                } to-transparent pointer-events-none`}
                              />
                            </div>
                            
                            {isExpanded && hasContainers && (
                              <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {service.containers.map((container) => (
                                  <div
                                    key={container.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
                                  >
                                    <Box className="h-4 w-4 text-zinc-500" />
                                    <span className="text-sm text-zinc-300 font-mono">
                                      {container.name}
                                    </span>
                                    <span
                                      className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                        container.state === "running"
                                          ? container.healthStatus === "unhealthy"
                                            ? "bg-amber-500/10 text-amber-400"
                                            : "bg-emerald-500/10 text-emerald-400"
                                          : "bg-red-500/10 text-red-400"
                                      }`}
                                    >
                                      {container.state}
                                      {container.healthStatus && container.healthStatus !== "none" && ` (${container.healthStatus})`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            {status.incidents.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
                  Recent Incidents
                </h3>
                <div className="space-y-3">
                  {status.incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="rounded-xl bg-white/5 border border-white/10 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-white">
                            {incident.title}
                          </h4>
                          <p className="text-sm text-zinc-500 mt-1">
                            {new Date(incident.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize ${
                            incident.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : incident.status === "mitigated"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status.incidents.length === 0 && (
              <div className="mt-12 text-center py-8 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-zinc-400">
                  No incidents reported in the last 7 days
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-zinc-500">
            Unable to load status data
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-zinc-600 text-sm">
            Powered by{" "}
            <span className="text-zinc-400 font-medium">Controlyze</span>
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

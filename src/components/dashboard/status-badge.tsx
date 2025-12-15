"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  healthStatus?: string;
  className?: string;
}

export function StatusBadge({ status, healthStatus, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (healthStatus === "unhealthy") {
      return {
        label: "Unhealthy",
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-500 border-red-500/20",
      };
    }

    switch (status.toLowerCase()) {
      case "running":
        return {
          label: healthStatus === "healthy" ? "Healthy" : "Running",
          variant: "default" as const,
          className: "bg-green-500/10 text-green-500 border-green-500/20",
        };
      case "exited":
        return {
          label: "Exited",
          variant: "secondary" as const,
          className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        };
      case "paused":
        return {
          label: "Paused",
          variant: "secondary" as const,
          className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        };
      case "restarting":
        return {
          label: "Restarting",
          variant: "secondary" as const,
          className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        };
      case "dead":
        return {
          label: "Dead",
          variant: "destructive" as const,
          className: "bg-red-500/10 text-red-500 border-red-500/20",
        };
      case "created":
        return {
          label: "Created",
          variant: "secondary" as const,
          className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
      default:
        return {
          label: status,
          variant: "secondary" as const,
          className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: "info" | "warning" | "critical";
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = {
    info: {
      label: "Info",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    warning: {
      label: "Warning",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    critical: {
      label: "Critical",
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  }[severity];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}

interface IncidentStatusBadgeProps {
  status: "open" | "investigating" | "mitigated" | "resolved";
  className?: string;
}

export function IncidentStatusBadge({ status, className }: IncidentStatusBadgeProps) {
  const config = {
    open: {
      label: "Open",
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
    investigating: {
      label: "Investigating",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    mitigated: {
      label: "Mitigated",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    resolved: {
      label: "Resolved",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
  }[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}

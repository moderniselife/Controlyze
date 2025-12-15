"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Power,
  AlertTriangle,
  Activity,
  MemoryStick,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/dashboard/status-badge";

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditionType: string;
  severity: "info" | "warning" | "critical";
  triggerCount: number;
  lastTriggered?: string;
}

const defaultAlerts: AlertRule[] = [
  {
    id: "1",
    name: "Container Unhealthy",
    description: "Alert when a container becomes unhealthy",
    enabled: true,
    conditionType: "health_status",
    severity: "warning",
    triggerCount: 3,
    lastTriggered: "2 hours ago",
  },
  {
    id: "2",
    name: "Restart Loop",
    description: "Alert when a container restarts more than 3 times in 5 minutes",
    enabled: true,
    conditionType: "restart_count",
    severity: "critical",
    triggerCount: 1,
    lastTriggered: "1 day ago",
  },
  {
    id: "3",
    name: "High Memory Usage",
    description: "Alert when memory usage exceeds 90%",
    enabled: true,
    conditionType: "resource_threshold",
    severity: "warning",
    triggerCount: 12,
    lastTriggered: "30 minutes ago",
  },
  {
    id: "4",
    name: "Log Error Pattern",
    description: "Alert on error patterns in logs",
    enabled: false,
    conditionType: "log_pattern",
    severity: "info",
    triggerCount: 0,
  },
];

const conditionIcons: Record<string, React.ReactNode> = {
  health_status: <AlertTriangle className="h-4 w-4" />,
  restart_count: <RotateCcw className="h-4 w-4" />,
  resource_threshold: <MemoryStick className="h-4 w-4" />,
  log_pattern: <Activity className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>(defaultAlerts);

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
      )
    );
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alert Rules</h2>
          <p className="text-muted-foreground">
            Configure alerts for container health, performance, and logs
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`bg-card/50 ${!alert.enabled ? "opacity-60" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      alert.enabled ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    {conditionIcons[alert.conditionType]}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {alert.name}
                      <SeverityBadge severity={alert.severity} />
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {alert.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alert.enabled}
                    onCheckedChange={() => toggleAlert(alert.id)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Rule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleAlert(alert.id)}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        {alert.enabled ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteAlert(alert.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>{alert.triggerCount} triggers</span>
                </div>
                {alert.lastTriggered && (
                  <div>Last triggered: {alert.lastTriggered}</div>
                )}
                <Badge variant="outline" className="text-xs">
                  {alert.conditionType.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

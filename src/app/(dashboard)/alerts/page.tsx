"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  conditionType: string;
  conditionConfig: Record<string, any>;
  severity: "info" | "warning" | "critical";
  routing: Record<string, any> | null;
  cooldownMinutes: number;
  triggerCount: number;
  lastTriggeredAt: Date | null;
}

interface AlertEvent {
  id: string;
  alertId: string;
  alertName: string | null;
  containerId: string | null;
  serviceName: string | null;
  severity: string;
  message: string;
  acknowledged: boolean;
  incidentId: string | null;
  createdAt: Date;
}

const conditionIcons: Record<string, React.ReactNode> = {
  health_status: <AlertTriangle className="h-4 w-4" />,
  restart_count: <RotateCcw className="h-4 w-4" />,
  resource_threshold: <MemoryStick className="h-4 w-4" />,
  log_pattern: <Activity className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "events">("rules");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    conditionType: "health_status",
    severity: "warning",
    cooldownMinutes: 5,
    // Condition-specific fields
    healthStatus: "unhealthy",
    duration: "30s",
    restartThreshold: 3,
    restartWindow: "5m",
    resourceMetric: "memory_percent",
    resourceThreshold: 90,
    logPattern: "",
    logExcludePattern: "",
    // Routing
    routeDiscord: true,
    routeAutoTicket: false,
    routeCreateIncident: true,
  });

  useEffect(() => {
    fetchAlerts();
    fetchAlertEvents();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/alerts");
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlertEvents = async () => {
    try {
      const response = await fetch("/api/alerts/events?limit=50");
      const data = await response.json();
      if (data.success) {
        setAlertEvents(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch alert events:", error);
    }
  };

  const toggleAlert = async (id: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await response.json();
      if (data.success) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === id ? { ...alert, enabled: !currentEnabled } : alert
          )
        );
        toast.success(`Alert ${!currentEnabled ? "enabled" : "disabled"}`);
      }
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
        toast.success("Alert deleted");
      }
    } catch {
      toast.error("Failed to delete alert");
    }
  };

  const getDefaultFormData = () => ({
    name: "",
    description: "",
    conditionType: "health_status",
    severity: "warning",
    cooldownMinutes: 5,
    healthStatus: "unhealthy",
    duration: "30s",
    restartThreshold: 3,
    restartWindow: "5m",
    resourceMetric: "memory_percent",
    resourceThreshold: 90,
    logPattern: "",
    logExcludePattern: "",
    routeDiscord: true,
    routeAutoTicket: false,
    routeCreateIncident: true,
  });

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      let conditionConfig: Record<string, any> = {};
      
      switch (formData.conditionType) {
        case "health_status":
          conditionConfig = { status: formData.healthStatus, duration: formData.duration };
          break;
        case "restart_count":
          conditionConfig = { threshold: formData.restartThreshold, window: formData.restartWindow };
          break;
        case "resource_threshold":
          conditionConfig = { metric: formData.resourceMetric, threshold: formData.resourceThreshold, duration: formData.duration };
          break;
        case "log_pattern":
          conditionConfig = { pattern: formData.logPattern, excludePattern: formData.logExcludePattern || undefined };
          break;
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        conditionType: formData.conditionType,
        conditionConfig,
        severity: formData.severity,
        cooldownMinutes: formData.cooldownMinutes,
        routing: { discord: formData.routeDiscord, autoTicket: formData.routeAutoTicket, createIncident: formData.routeCreateIncident },
      };

      const url = editingAlert ? `/api/alerts/${editingAlert.id}` : "/api/alerts";
      const method = editingAlert ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(editingAlert ? "Alert updated" : "Alert created");
        setDialogOpen(false);
        setEditingAlert(null);
        setFormData(getDefaultFormData());
        fetchAlerts();
      } else {
        toast.error(data.error || "Failed to save alert");
      }
    } catch {
      toast.error("Failed to save alert");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (alert: AlertRule) => {
    setEditingAlert(alert);
    const config = alert.conditionConfig || {};
    setFormData({
      ...getDefaultFormData(),
      name: alert.name,
      description: alert.description || "",
      conditionType: alert.conditionType,
      severity: alert.severity,
      cooldownMinutes: alert.cooldownMinutes,
      healthStatus: config.status || "unhealthy",
      duration: config.duration || "30s",
      restartThreshold: config.threshold || 3,
      restartWindow: config.window || "5m",
      resourceMetric: config.metric || "memory_percent",
      resourceThreshold: config.threshold || 90,
      logPattern: config.pattern || "",
      logExcludePattern: config.excludePattern || "",
      routeDiscord: alert.routing?.discord ?? true,
      routeAutoTicket: alert.routing?.autoTicket ?? false,
      routeCreateIncident: alert.routing?.createIncident ?? true,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingAlert(null);
    setFormData(getDefaultFormData());
    setDialogOpen(true);
  };

  const unacknowledgedCount = alertEvents.filter((e) => !e.acknowledged).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alerts</h2>
          <p className="text-muted-foreground">
            Monitor triggered alerts and configure alert rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={activeTab === "events" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("events")}
              className="relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Events
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
                  {unacknowledgedCount}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "rules" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("rules")}
            >
              <Activity className="h-4 w-4 mr-2" />
              Rules
            </Button>
          </div>
          {activeTab === "rules" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAlert ? "Edit Alert" : "Create Alert"}</DialogTitle>
              <DialogDescription>
                Configure alert conditions and notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Alert name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this alert monitors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition Type</Label>
                  <Select
                    value={formData.conditionType}
                    onValueChange={(value) => setFormData({ ...formData, conditionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="health_status">Health Status</SelectItem>
                      <SelectItem value="restart_count">Restart Count</SelectItem>
                      <SelectItem value="resource_threshold">Resource Threshold</SelectItem>
                      <SelectItem value="log_pattern">Log Pattern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condition-specific fields */}
              {formData.conditionType === "health_status" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Health Status</Label>
                    <Select
                      value={formData.healthStatus}
                      onValueChange={(value) => setFormData({ ...formData, healthStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unhealthy">Unhealthy</SelectItem>
                        <SelectItem value="healthy">Healthy</SelectItem>
                        <SelectItem value="starting">Starting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 30s, 1m, 5m"
                    />
                  </div>
                </div>
              )}

              {formData.conditionType === "restart_count" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Threshold (restarts)</Label>
                    <Input
                      type="number"
                      value={formData.restartThreshold}
                      onChange={(e) => setFormData({ ...formData, restartThreshold: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Window</Label>
                    <Input
                      value={formData.restartWindow}
                      onChange={(e) => setFormData({ ...formData, restartWindow: e.target.value })}
                      placeholder="e.g., 5m, 10m, 1h"
                    />
                  </div>
                </div>
              )}

              {formData.conditionType === "resource_threshold" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select
                      value={formData.resourceMetric}
                      onValueChange={(value) => setFormData({ ...formData, resourceMetric: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="memory_percent">Memory %</SelectItem>
                        <SelectItem value="cpu_percent">CPU %</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Threshold (%)</Label>
                    <Input
                      type="number"
                      value={formData.resourceThreshold}
                      onChange={(e) => setFormData({ ...formData, resourceThreshold: parseInt(e.target.value) || 90 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 2m"
                    />
                  </div>
                </div>
              )}

              {formData.conditionType === "log_pattern" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pattern (regex)</Label>
                    <Input
                      value={formData.logPattern}
                      onChange={(e) => setFormData({ ...formData, logPattern: e.target.value })}
                      placeholder="e.g., error|exception|failed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exclude Pattern (optional)</Label>
                    <Input
                      value={formData.logExcludePattern}
                      onChange={(e) => setFormData({ ...formData, logExcludePattern: e.target.value })}
                      placeholder="e.g., healthcheck"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    value={formData.cooldownMinutes}
                    onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>

              {/* Routing options */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">When Alert Triggers</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="routeCreateIncident" className="text-sm font-normal">Create incident</Label>
                    <p className="text-xs text-muted-foreground">Automatically create an incident when this alert fires</p>
                  </div>
                  <Switch
                    id="routeCreateIncident"
                    checked={formData.routeCreateIncident}
                    onCheckedChange={(checked) => setFormData({ ...formData, routeCreateIncident: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="routeDiscord" className="text-sm font-normal">Send to Discord</Label>
                    <p className="text-xs text-muted-foreground">Send notification to Discord webhook</p>
                  </div>
                  <Switch
                    id="routeDiscord"
                    checked={formData.routeDiscord}
                    onCheckedChange={(checked) => setFormData({ ...formData, routeDiscord: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="routeAutoTicket" className="text-sm font-normal">Auto-create ticket</Label>
                    <p className="text-xs text-muted-foreground">Create a Linear ticket automatically</p>
                  </div>
                  <Switch
                    id="routeAutoTicket"
                    checked={formData.routeAutoTicket}
                    onCheckedChange={(checked) => setFormData({ ...formData, routeAutoTicket: checked })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSaving || !formData.name}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingAlert ? "Update Alert" : "Create Alert"}
              </Button>
              </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeTab === "events" && (
        <div className="space-y-4">
          {alertEvents.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No triggered alerts</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  When alerts are triggered, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {alertEvents.map((event) => (
                <Card key={event.id} className="bg-card/50">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            event.severity === "critical"
                              ? "bg-red-500/10"
                              : event.severity === "warning"
                              ? "bg-yellow-500/10"
                              : "bg-blue-500/10"
                          }`}
                        >
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              event.severity === "critical"
                                ? "text-red-500"
                                : event.severity === "warning"
                                ? "text-yellow-500"
                                : "text-blue-500"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {event.alertName || "Alert"}
                            <SeverityBadge severity={event.severity as "info" | "warning" | "critical"} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.createdAt).toLocaleString()}
                            </div>
                            {event.serviceName && (
                              <Badge variant="outline" className="text-xs">
                                {event.serviceName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {event.acknowledged && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "rules" && (isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create alert rules to monitor container health, performance, and logs.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                    onCheckedChange={() => toggleAlert(alert.id, alert.enabled)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(alert)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Rule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleAlert(alert.id, alert.enabled)}
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
                {alert.lastTriggeredAt && (
                  <div>Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}</div>
                )}
                <Badge variant="outline" className="text-xs">
                  {alert.conditionType.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      ))}
    </div>
  );
}

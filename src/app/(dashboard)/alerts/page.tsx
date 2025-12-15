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

const conditionIcons: Record<string, React.ReactNode> = {
  health_status: <AlertTriangle className="h-4 w-4" />,
  restart_count: <RotateCcw className="h-4 w-4" />,
  resource_threshold: <MemoryStick className="h-4 w-4" />,
  log_pattern: <Activity className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    conditionType: "health_status",
    severity: "warning",
    cooldownMinutes: 5,
  });

  useEffect(() => {
    fetchAlerts();
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

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        conditionType: formData.conditionType,
        conditionConfig: {},
        severity: formData.severity,
        cooldownMinutes: formData.cooldownMinutes,
        routing: { discord: true },
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
        setFormData({ name: "", description: "", conditionType: "health_status", severity: "warning", cooldownMinutes: 5 });
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
    setFormData({
      name: alert.name,
      description: alert.description || "",
      conditionType: alert.conditionType,
      severity: alert.severity,
      cooldownMinutes: alert.cooldownMinutes,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingAlert(null);
    setFormData({ name: "", description: "", conditionType: "health_status", severity: "warning", cooldownMinutes: 5 });
    setDialogOpen(true);
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
              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={formData.cooldownMinutes}
                  onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 5 })}
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSaving || !formData.name}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingAlert ? "Update Alert" : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
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
      )}
    </div>
  );
}

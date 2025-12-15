"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  Check,
  Shield,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Box,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AuthUser {
  username: string;
  passwordHash?: string;
}

interface AuthConfig {
  enabled: boolean;
  provider: string;
  users: AuthUser[];
}

interface ServiceContainer {
  id: string;
  name: string;
  state: string;
  healthStatus?: string;
}

interface StatusServiceConfig {
  name: string;
  displayName: string;
  group: string;
  enabled: boolean;
  impact: "critical" | "major" | "minor";
  containers: ServiceContainer[];
}

interface StatusPageConfig {
  enabled: boolean;
  title: string;
  domain: string;
  services: StatusServiceConfig[];
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    enabled: false,
    provider: "local",
    users: [],
  });
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusConfig, setStatusConfig] = useState<StatusPageConfig>({
    enabled: true,
    title: "System Status",
    domain: "",
    services: [],
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  // Group services by their group
  const groupedServices = statusConfig.services.reduce((acc, service) => {
    if (!acc[service.group]) {
      acc[service.group] = [];
    }
    acc[service.group].push(service);
    return acc;
  }, {} as Record<string, StatusServiceConfig[]>);

  const groupOrder = ["Media", "Indexing", "Automation", "Infrastructure", "Storage", "Other"];

  useEffect(() => {
    fetchAuthConfig();
    fetchStatusConfig();
  }, []);

  const fetchAuthConfig = async () => {
    try {
      const response = await fetch("/api/config/auth");
      const data = await response.json();
      if (data.success) {
        setAuthConfig(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch auth config:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveAuth = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/config/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authConfig),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Authentication settings saved");
      } else {
        toast.error(data.error || "Failed to save auth settings");
      }
    } catch (error) {
      toast.error("Failed to save auth settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error("Username and password required");
      return;
    }
    try {
      const response = await fetch("/api/config/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (data.success) {
        setAuthConfig((prev) => ({
          ...prev,
          users: [...prev.users, { username: newUser.username }],
        }));
        setNewUser({ username: "", password: "" });
        toast.success("User added");
      } else {
        toast.error(data.error || "Failed to add user");
      }
    } catch (error) {
      toast.error("Failed to add user");
    }
  };

  const handleDeleteUser = async (username: string) => {
    try {
      const response = await fetch(`/api/config/auth/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setAuthConfig((prev) => ({
          ...prev,
          users: prev.users.filter((u) => u.username !== username),
        }));
        toast.success("User deleted");
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const fetchStatusConfig = async () => {
    try {
      const response = await fetch("/api/config/status");
      const data = await response.json();
      if (data.success) {
        setStatusConfig(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch status config:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/config/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusConfig),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Status page settings saved");
      } else {
        toast.error(data.error || "Failed to save status settings");
      }
    } catch (error) {
      toast.error("Failed to save status settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateServiceImpact = (serviceName: string, impact: "critical" | "major" | "minor") => {
    setStatusConfig((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.name === serviceName ? { ...s, impact } : s
      ),
    }));
  };

  const toggleServiceEnabled = (serviceName: string) => {
    setStatusConfig((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.name === serviceName ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure Controlyze preferences and integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Config
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="status">Status Page</TabsTrigger>
          <TabsTrigger value="docker">Docker</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of Controlyze
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <Select defaultValue="dark">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default View</Label>
                  <p className="text-sm text-muted-foreground">
                    Landing page when opening Controlyze
                  </p>
                </div>
                <Select defaultValue="overview">
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="containers">Containers</SelectItem>
                    <SelectItem value="logs">Logs</SelectItem>
                    <SelectItem value="stacks">Stacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Refresh Interval</Label>
                  <p className="text-sm text-muted-foreground">
                    How often to refresh data automatically
                  </p>
                </div>
                <Select defaultValue="5s">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1s">1 second</SelectItem>
                    <SelectItem value="5s">5 seconds</SelectItem>
                    <SelectItem value="10s">10 seconds</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="off">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication
              </CardTitle>
              <CardDescription>
                Control access to Controlyze with user authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require login to access Controlyze
                  </p>
                </div>
                <Switch
                  checked={authConfig.enabled}
                  onCheckedChange={(checked) =>
                    setAuthConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
              {authConfig.enabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Users</Label>
                      <span className="text-sm text-muted-foreground">
                        {authConfig.users.length} user(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {authConfig.users.map((user) => (
                        <div
                          key={user.username}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        >
                          <span className="font-mono">{user.username}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.username)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {authConfig.users.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No users configured. Add a user below.
                        </p>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Add New User</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Username"
                          value={newUser.username}
                          onChange={(e) =>
                            setNewUser((prev) => ({ ...prev, username: e.target.value }))
                          }
                        />
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser((prev) => ({ ...prev, password: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button onClick={handleAddUser}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <Button onClick={handleSaveAuth} disabled={isSaving} className="w-full">
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Authentication Settings
                  </Button>
                </>
              )}
              {!authConfig.enabled && (
                <Button onClick={handleSaveAuth} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Authentication Settings
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Status Page
              </CardTitle>
              <CardDescription>
                Configure which services appear on the public status page and their impact level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Status Page</Label>
                  <p className="text-sm text-muted-foreground">
                    Make status page available at /status
                  </p>
                </div>
                <Switch
                  checked={statusConfig.enabled}
                  onCheckedChange={(checked) =>
                    setStatusConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input
                  value={statusConfig.title}
                  onChange={(e) =>
                    setStatusConfig((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="System Status"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Status Page Domain</Label>
                <p className="text-sm text-muted-foreground">
                  When accessing from this domain, automatically show the status page instead of the dashboard
                </p>
                <Input
                  value={statusConfig.domain}
                  onChange={(e) =>
                    setStatusConfig((prev) => ({ ...prev, domain: e.target.value }))
                  }
                  placeholder="status.example.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Service Impact Levels
              </CardTitle>
              <CardDescription>
                Configure how each service affects the overall status. Minor services won&apos;t cause a &quot;Major Outage&quot; status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : statusConfig.services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No services configured. Services will be auto-detected from your containers.
                </p>
              ) : (
                <div className="space-y-4">
                  {groupOrder.filter(g => groupedServices[g]).map((group) => (
                    <div key={group} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center justify-between p-3 bg-background/50 hover:bg-background/70 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group}</span>
                          <span className="text-xs text-muted-foreground">
                            ({groupedServices[group].length} service{groupedServices[group].length !== 1 ? "s" : ""})
                          </span>
                        </div>
                        {expandedGroups.has(group) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedGroups.has(group) && (
                        <div className="border-t">
                          {groupedServices[group].map((service) => (
                            <div key={service.name} className="border-b last:border-b-0">
                              <div className="flex items-center justify-between p-3 bg-card/30">
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={service.enabled}
                                    onCheckedChange={() => toggleServiceEnabled(service.name)}
                                  />
                                  <span className="font-medium">{service.displayName}</span>
                                </div>
                                <Select
                                  value={service.impact}
                                  onValueChange={(value: "critical" | "major" | "minor") =>
                                    updateServiceImpact(service.name, value)
                                  }
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="critical">
                                      <span className="text-red-500">Critical</span>
                                    </SelectItem>
                                    <SelectItem value="major">
                                      <span className="text-amber-500">Major</span>
                                    </SelectItem>
                                    <SelectItem value="minor">
                                      <span className="text-blue-500">Minor</span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {service.containers && service.containers.length > 0 && (
                                <div className="px-3 py-2 bg-muted/20 text-xs">
                                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                    <Box className="h-3 w-3" />
                                    <span>Containers:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {service.containers.map((container) => (
                                      <span
                                        key={container.id}
                                        className={`px-2 py-0.5 rounded-full text-xs ${
                                          container.state === "running"
                                            ? container.healthStatus === "unhealthy"
                                              ? "bg-amber-500/20 text-amber-400"
                                              : "bg-emerald-500/20 text-emerald-400"
                                            : "bg-red-500/20 text-red-400"
                                        }`}
                                      >
                                        {container.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong className="text-red-500">Critical:</strong> Core services - if down, shows &quot;Major Outage&quot;</p>
                <p><strong className="text-amber-500">Major:</strong> Important services - if down, shows &quot;Partial Outage&quot;</p>
                <p><strong className="text-blue-500">Minor:</strong> Non-essential services - if down, doesn&apos;t affect overall status</p>
              </div>
              <Button onClick={handleSaveStatus} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Status Page Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docker" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Docker Connection</CardTitle>
              <CardDescription>
                Configure how Controlyze connects to Docker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Connection Type</Label>
                  <p className="text-sm text-muted-foreground">
                    How to connect to the Docker daemon
                  </p>
                </div>
                <Select defaultValue="socket">
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socket">Unix Socket</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="ssh">SSH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Socket Path</Label>
                <Input
                  defaultValue="/var/run/docker.sock"
                  placeholder="/var/run/docker.sock"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Container Actions</CardTitle>
              <CardDescription>
                Safety settings for container operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Container Actions</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow start/stop/restart from the UI
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirm Destructive Actions</Label>
                  <p className="text-sm text-muted-foreground">
                    Require confirmation before stopping containers
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Exec</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow executing commands in containers (disabled by default)
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Alert Defaults</CardTitle>
              <CardDescription>
                Default settings for new alert rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Cooldown</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimum time between repeated alerts
                  </p>
                </div>
                <Select defaultValue="5m">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 minute</SelectItem>
                    <SelectItem value="5m">5 minutes</SelectItem>
                    <SelectItem value="15m">15 minutes</SelectItem>
                    <SelectItem value="1h">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Deduplication</Label>
                  <p className="text-sm text-muted-foreground">
                    Group similar alerts together
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Log Settings</CardTitle>
              <CardDescription>
                Configure log retention and redaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Retention Period</Label>
                  <p className="text-sm text-muted-foreground">
                    How long to keep logs
                  </p>
                </div>
                <Select defaultValue="7">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Indexing</Label>
                  <p className="text-sm text-muted-foreground">
                    Index logs for faster searching
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Redact Secrets</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically redact API keys and tokens from logs
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

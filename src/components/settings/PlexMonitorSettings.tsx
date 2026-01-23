"use client";

import { useState, useEffect } from "react";
import { Film, Save, RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface PlexSettings {
  enabled: boolean;
  plexUrl: string;
  plexToken: string;
  plexContainerName: string;
  zurgContainerName: string;
  checkIntervalSeconds: number;
  maxConsecutiveFailures: number;
  restartDelaySeconds: number;
  discordWebhookUrl: string;
  webhookUrl: string;
  monitoredLibraries: string[];
  enableAlerts: boolean;
}

export function PlexMonitorSettings() {
  const [settings, setSettings] = useState<PlexSettings>({
    enabled: false,
    plexUrl: "",
    plexToken: "",
    plexContainerName: "plex",
    zurgContainerName: "pd_zurg",
    checkIntervalSeconds: 60,
    maxConsecutiveFailures: 3,
    restartDelaySeconds: 5,
    discordWebhookUrl: "",
    webhookUrl: "",
    monitoredLibraries: [],
    enableAlerts: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [libraryInput, setLibraryInput] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/plex");
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
        setLibraryInput(data.data.monitoredLibraries.join(", "));
      }
    } catch (error) {
      toast.error("Failed to load Plex settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const libraries = libraryInput
        .split(",")
        .map((lib) => lib.trim())
        .filter((lib) => lib.length > 0);

      const response = await fetch("/api/settings/plex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          monitoredLibraries: libraries,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Plex settings saved successfully");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save Plex settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Plex Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          Plex Monitor
        </CardTitle>
        <CardDescription>
          Configure automatic monitoring and restart for Plex Media Server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Plex Monitoring</Label>
            <p className="text-sm text-muted-foreground">
              Automatically monitor and restart Plex when media becomes unavailable
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, enabled: checked })
            }
          />
        </div>

        <Separator />

        {/* Basic Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Basic Configuration</h3>
          
          <div className="space-y-2">
            <Label htmlFor="plexUrl">Plex Server URL *</Label>
            <Input
              id="plexUrl"
              placeholder="http://your-plex-server:32400"
              value={settings.plexUrl}
              onChange={(e) =>
                setSettings({ ...settings, plexUrl: e.target.value })
              }
              disabled={!settings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plexToken">Plex Token *</Label>
            <div className="relative">
              <Input
                id="plexToken"
                type={showToken ? "text" : "password"}
                placeholder="Your Plex authentication token"
                value={settings.plexToken}
                onChange={(e) =>
                  setSettings({ ...settings, plexToken: e.target.value })
                }
                disabled={!settings.enabled}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
                disabled={!settings.enabled}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your token from Plex: Settings → Account → Get Info → View XML
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plexContainer">Plex Container Name</Label>
              <Input
                id="plexContainer"
                placeholder="plex"
                value={settings.plexContainerName}
                onChange={(e) =>
                  setSettings({ ...settings, plexContainerName: e.target.value })
                }
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zurgContainer">Zurg Container Name</Label>
              <Input
                id="zurgContainer"
                placeholder="pd_zurg"
                value={settings.zurgContainerName}
                onChange={(e) =>
                  setSettings({ ...settings, zurgContainerName: e.target.value })
                }
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Monitoring Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Monitoring Settings</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInterval">Check Interval (seconds)</Label>
              <Input
                id="checkInterval"
                type="number"
                min="10"
                max="600"
                value={settings.checkIntervalSeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkIntervalSeconds: parseInt(e.target.value) || 60,
                  })
                }
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxFailures">Max Failures</Label>
              <Input
                id="maxFailures"
                type="number"
                min="1"
                max="10"
                value={settings.maxConsecutiveFailures}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxConsecutiveFailures: parseInt(e.target.value) || 3,
                  })
                }
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restartDelay">Restart Delay (seconds)</Label>
              <Input
                id="restartDelay"
                type="number"
                min="1"
                max="60"
                value={settings.restartDelaySeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    restartDelaySeconds: parseInt(e.target.value) || 5,
                  })
                }
                disabled={!settings.enabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="libraries">Monitored Libraries (optional)</Label>
            <Input
              id="libraries"
              placeholder="Movies, TV Shows, Anime (leave empty for all)"
              value={libraryInput}
              onChange={(e) => setLibraryInput(e.target.value)}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of library names or keys. Leave empty to monitor all libraries.
            </p>
          </div>
        </div>

        <Separator />

        {/* Notifications & Integrations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Notifications & Integrations</h3>

          <div className="space-y-2">
            <Label htmlFor="discordWebhook">Discord Webhook URL</Label>
            <Input
              id="discordWebhook"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.discordWebhookUrl}
              onChange={(e) =>
                setSettings({ ...settings, discordWebhookUrl: e.target.value })
              }
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Receive Discord notifications when containers are restarted
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook">Custom Webhook URL</Label>
            <Input
              id="webhook"
              placeholder="https://your-domain.com/api/plex-events"
              value={settings.webhookUrl}
              onChange={(e) =>
                setSettings({ ...settings, webhookUrl: e.target.value })
              }
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Send HTTP POST webhooks to external systems (Home Assistant, n8n, etc.)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Alert Integration</Label>
              <p className="text-sm text-muted-foreground">
                Create alerts in Controlyze when Plex media becomes unavailable
              </p>
            </div>
            <Switch
              checked={settings.enableAlerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableAlerts: checked })
              }
              disabled={!settings.enabled}
            />
          </div>
        </div>

        <Separator />

        {/* Status Info */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Status Page Integration:</strong> Plex monitoring data is automatically
                displayed on your status page at <code className="text-xs">/status</code>
              </p>
              <p>
                <strong>Grafana Integration:</strong> Metrics are available at{" "}
                <code className="text-xs">/api/metrics/plex</code> for Prometheus scraping
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {settings.enabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Monitoring enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Monitoring disabled</span>
              </>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving || !settings.enabled}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

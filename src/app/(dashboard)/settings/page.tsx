"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  Check,
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

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

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

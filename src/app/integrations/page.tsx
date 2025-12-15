"use client";

import { useState } from "react";
import {
  Plug,
  MessageSquare,
  Ticket,
  Github,
  Webhook,
  Check,
  X,
  ExternalLink,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  status?: string;
}

export default function IntegrationsPage() {
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [linearEnabled, setLinearEnabled] = useState(false);
  const [linearApiKey, setLinearApiKey] = useState("");
  const [linearTeamId, setLinearTeamId] = useState("");

  const integrations: Integration[] = [
    {
      id: "discord",
      name: "Discord",
      description: "Send alerts and incident notifications to Discord channels",
      icon: <MessageSquare className="h-6 w-6" />,
      connected: discordEnabled && !!discordWebhook,
      status: discordEnabled ? "Active" : "Not configured",
    },
    {
      id: "linear",
      name: "Linear",
      description: "Create and sync tickets with Linear for incident tracking",
      icon: <Ticket className="h-6 w-6" />,
      connected: linearEnabled && !!linearApiKey,
      status: linearEnabled ? "Active" : "Not configured",
    },
    {
      id: "github",
      name: "GitHub Issues",
      description: "Create GitHub issues from incidents",
      icon: <Github className="h-6 w-6" />,
      connected: false,
      status: "Not configured",
    },
    {
      id: "webhook",
      name: "Generic Webhook",
      description: "Send notifications to any webhook endpoint",
      icon: <Webhook className="h-6 w-6" />,
      connected: false,
      status: "Not configured",
    },
  ];

  const handleTestDiscord = async () => {
    if (!discordWebhook) {
      toast.error("Please enter a webhook URL");
      return;
    }

    try {
      const response = await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Controlyze",
          embeds: [
            {
              title: "✅ Test Message",
              description: "Discord integration is working correctly!",
              color: 0x22c55e,
              timestamp: new Date().toISOString(),
              footer: { text: "Controlyze" },
            },
          ],
        }),
      });

      if (response.ok) {
        toast.success("Test message sent to Discord!");
      } else {
        toast.error("Failed to send test message");
      }
    } catch {
      toast.error("Failed to connect to Discord");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect Controlyze with your favorite tools
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id} className="bg-card/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      integration.connected
                        ? "bg-green-500/10 text-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {integration.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    integration.connected
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {integration.connected ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {integration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {integration.id === "discord" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Discord Integration</DialogTitle>
                      <DialogDescription>
                        Configure Discord webhook for alerts and notifications
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="discord-enabled">Enable Discord</Label>
                        <Switch
                          id="discord-enabled"
                          checked={discordEnabled}
                          onCheckedChange={setDiscordEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discord-webhook">Webhook URL</Label>
                        <Input
                          id="discord-webhook"
                          placeholder="https://discord.com/api/webhooks/..."
                          value={discordWebhook}
                          onChange={(e) => setDiscordWebhook(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Create a webhook in your Discord server settings
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleTestDiscord}
                          className="flex-1"
                        >
                          Send Test Message
                        </Button>
                        <Button className="flex-1">Save</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {integration.id === "linear" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Linear Integration</DialogTitle>
                      <DialogDescription>
                        Connect to Linear for ticket management
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="linear-enabled">Enable Linear</Label>
                        <Switch
                          id="linear-enabled"
                          checked={linearEnabled}
                          onCheckedChange={setLinearEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linear-api-key">API Key</Label>
                        <Input
                          id="linear-api-key"
                          type="password"
                          placeholder="lin_api_..."
                          value={linearApiKey}
                          onChange={(e) => setLinearApiKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linear-team-id">Team ID</Label>
                        <Input
                          id="linear-team-id"
                          placeholder="Enter your team ID"
                          value={linearTeamId}
                          onChange={(e) => setLinearTeamId(e.target.value)}
                        />
                      </div>
                      <Button className="w-full">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {(integration.id === "github" || integration.id === "webhook") && (
                <Button variant="outline" className="w-full" disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

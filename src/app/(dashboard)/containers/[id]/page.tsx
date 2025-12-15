"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Terminal,
  Box,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContainersStore } from "@/stores/containers";
import type { ContainerInfo, PortBinding } from "@/types";
import { toast } from "sonner";

function getStatusColor(state: string, health?: string) {
  if (health === "unhealthy") return "text-red-500 bg-red-500/10 border-red-500/20";
  if (state === "running") return "text-green-500 bg-green-500/10 border-green-500/20";
  if (state === "exited") return "text-gray-500 bg-gray-500/10 border-gray-500/20";
  if (state === "paused") return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  return "text-gray-500 bg-gray-500/10 border-gray-500/20";
}

function getStatusIcon(state: string, health?: string) {
  if (health === "unhealthy") return <AlertTriangle className="h-5 w-5" />;
  if (state === "running") return <CheckCircle2 className="h-5 w-5" />;
  if (state === "exited") return <XCircle className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
}

export default function ContainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;
  const { containers, fetchContainers, isLoading } = useContainersStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const container = containers.find((c) => c.id === containerId || c.id.startsWith(containerId));

  useEffect(() => {
    if (containers.length === 0) {
      fetchContainers();
    }
  }, [containers.length, fetchContainers]);

  const fetchLogs = async () => {
    if (!container) return;
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/docker/containers/${container.id}/logs?tail=100`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleContainerAction = async (action: "start" | "stop" | "restart") => {
    if (!container) return;
    setActionLoading(action);
    try {
      const response = await fetch(`/api/docker/containers/${container.id}/${action}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Container ${action}ed successfully`);
        fetchContainers();
      } else {
        toast.error(data.error || `Failed to ${action} container`);
      }
    } catch {
      toast.error(`Failed to ${action} container`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && !container) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="space-y-6">
        <Link href="/containers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Containers
          </Button>
        </Link>
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Container not found</h3>
            <p className="text-muted-foreground">
              The container could not be found. It may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/containers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(container.state, container.healthStatus)}`}>
              {getStatusIcon(container.state, container.healthStatus)}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{container.name}</h2>
              <p className="text-muted-foreground font-mono text-sm">{container.image}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {container.state !== "running" && (
            <Button
              variant="outline"
              onClick={() => handleContainerAction("start")}
              disabled={actionLoading === "start"}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          {container.state === "running" && (
            <Button
              variant="outline"
              onClick={() => handleContainerAction("stop")}
              disabled={actionLoading === "stop"}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleContainerAction("restart")}
            disabled={actionLoading === "restart"}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchContainers()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={getStatusColor(container.state, container.healthStatus)}>
              {container.healthStatus || container.state}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{container.status}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Restarts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{container.restartCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Stack</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{container.stackName || "Standalone"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <Box className="h-4 w-4 mr-2" />
            Info
          </TabsTrigger>
          <TabsTrigger value="ports">
            <Network className="h-4 w-4 mr-2" />
            Ports
          </TabsTrigger>
          <TabsTrigger value="logs" onClick={fetchLogs}>
            <Terminal className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Container Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Container ID</p>
                  <p className="font-mono text-sm">{container.id.slice(0, 12)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Image ID</p>
                  <p className="font-mono text-sm">{container.imageId.replace("sha256:", "").slice(0, 12)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(container.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Network Mode</p>
                  <p className="text-sm">{container.networkMode || "default"}</p>
                </div>
              </div>
              {container.mounts && container.mounts.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mounts</p>
                  <div className="space-y-1">
                    {container.mounts.map((mount, i) => (
                      <div key={i} className="text-xs font-mono bg-muted/50 p-2 rounded">
                        {mount.source} → {mount.destination} ({mount.mode})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ports">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Port Bindings</CardTitle>
            </CardHeader>
            <CardContent>
              {container.ports && container.ports.length > 0 ? (
                <div className="space-y-2">
                  {container.ports.map((port: PortBinding, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Network className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">
                          {port.hostIp || "0.0.0.0"}:{port.hostPort || "-"}
                        </span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono">
                        {port.containerPort}/{port.protocol}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No ports exposed</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Container Logs</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length > 0 ? (
                <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-auto">
                  <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                    {logs.join("\n")}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No logs available. Click refresh to load logs.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Plug,
  Check,
  X,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DockerInfo {
  containers: number;
  images: number;
  serverVersion: string;
  operatingSystem: string;
  architecture: string;
  memTotal: number;
  cpus: number;
}

export default function ConnectionsPage() {
  const [connectionType, setConnectionType] = useState("socket");
  const [socketPath, setSocketPath] = useState("/var/run/docker.sock");
  const [tcpHost, setTcpHost] = useState("");
  const [tcpPort, setTcpPort] = useState("2375");
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connected" | "error"
  >("idle");
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus("idle");
    setErrorMessage("");

    try {
      const config =
        connectionType === "socket"
          ? { type: "socket" as const, socketPath }
          : { type: "tcp" as const, host: tcpHost, port: parseInt(tcpPort) };

      const response = await fetch("/api/docker/connection/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus("connected");
        setDockerInfo(data.info);
        toast.success("Successfully connected to Docker");
      } else {
        setConnectionStatus("error");
        setErrorMessage(data.error || "Failed to connect");
        toast.error(data.error || "Failed to connect to Docker");
      }
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Connection failed"
      );
      toast.error("Failed to test connection");
    } finally {
      setIsTesting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Connections</h2>
        <p className="text-muted-foreground">
          Configure Docker Engine connections
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Docker Connection
            </CardTitle>
            <CardDescription>
              Configure how Controlyze connects to Docker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socket">Unix Socket</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="ssh" disabled>
                    SSH (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {connectionType === "socket" && (
              <div className="space-y-2">
                <Label>Socket Path</Label>
                <Input
                  value={socketPath}
                  onChange={(e) => setSocketPath(e.target.value)}
                  placeholder="/var/run/docker.sock"
                />
              </div>
            )}

            {connectionType === "tcp" && (
              <>
                <div className="space-y-2">
                  <Label>Host</Label>
                  <Input
                    value={tcpHost}
                    onChange={(e) => setTcpHost(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={tcpPort}
                    onChange={(e) => setTcpPort(e.target.value)}
                    placeholder="2375"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button variant="outline" className="flex-1">
                Save
              </Button>
            </div>

            {connectionStatus !== "idle" && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  connectionStatus === "connected"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {connectionStatus === "connected" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {connectionStatus === "connected"
                    ? "Connection successful"
                    : errorMessage}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {dockerInfo && (
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Docker Info
              </CardTitle>
              <CardDescription>
                Connected Docker host information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium">{dockerInfo.serverVersion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">OS</p>
                  <p className="font-medium">{dockerInfo.operatingSystem}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Architecture</p>
                  <p className="font-medium">{dockerInfo.architecture}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Containers</p>
                  <p className="font-medium">{dockerInfo.containers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Images</p>
                  <p className="font-medium">{dockerInfo.images}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPUs</p>
                  <p className="font-medium">{dockerInfo.cpus}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="font-medium">{formatBytes(dockerInfo.memTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

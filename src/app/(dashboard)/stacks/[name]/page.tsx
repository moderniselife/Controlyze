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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContainersStore } from "@/stores/containers";
import type { ContainerInfo, ServiceInfo, PortBinding } from "@/types";
import { toast } from "sonner";

function getStatusColor(state: string, health?: string) {
  if (health === "unhealthy") return "text-red-500 bg-red-500/10 border-red-500/20";
  if (state === "running") return "text-green-500 bg-green-500/10 border-green-500/20";
  if (state === "exited") return "text-gray-500 bg-gray-500/10 border-gray-500/20";
  if (state === "paused") return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  return "text-gray-500 bg-gray-500/10 border-gray-500/20";
}

function getStatusIcon(state: string, health?: string) {
  if (health === "unhealthy") return <AlertTriangle className="h-4 w-4" />;
  if (state === "running") return <CheckCircle2 className="h-4 w-4" />;
  if (state === "exited") return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

export default function StackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stackName = params.name as string;
  const { stacks, fetchStacks, isLoading } = useContainersStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const stack = stacks.find((s) => s.name === stackName);

  useEffect(() => {
    if (stacks.length === 0) {
      fetchStacks();
    }
  }, [stacks.length, fetchStacks]);

  const handleContainerAction = async (containerId: string, action: "start" | "stop" | "restart") => {
    setActionLoading(`${containerId}-${action}`);
    try {
      const response = await fetch(`/api/docker/containers/${containerId}/${action}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Container ${action}ed successfully`);
        fetchStacks();
      } else {
        toast.error(data.error || `Failed to ${action} container`);
      }
    } catch {
      toast.error(`Failed to ${action} container`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && !stack) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="space-y-6">
        <Link href="/stacks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stacks
          </Button>
        </Link>
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Stack not found</h3>
            <p className="text-muted-foreground">
              The stack &quot;{stackName}&quot; could not be found.
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
          <Link href="/stacks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{stack.name}</h2>
            <p className="text-muted-foreground">
              {stack.serviceCount} services • {stack.runningCount} running
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchStacks()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {stack.services.map((service: ServiceInfo) => (
          <Card key={service.name} className="bg-card/50">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(
                    service.runningReplicas === service.replicas ? "running" : "exited",
                    service.healthyReplicas < service.replicas ? "unhealthy" : undefined
                  )}`}>
                    {getStatusIcon(
                      service.runningReplicas === service.replicas ? "running" : "exited",
                      service.healthyReplicas < service.replicas ? "unhealthy" : undefined
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>
                      {service.replicas} container{service.replicas !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(
                  service.runningReplicas === service.replicas ? "running" : "exited",
                  service.healthyReplicas < service.replicas ? "unhealthy" : undefined
                )}>
                  {service.runningReplicas}/{service.replicas} running
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.containers.map((container: ContainerInfo) => (
                <div key={container.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${getStatusColor(container.state, container.healthStatus)}`}>
                      {getStatusIcon(container.state, container.healthStatus)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{container.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{container.image}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{container.status}</span>
                    <div className="flex gap-1">
                      {container.state !== "running" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleContainerAction(container.id, "start")}
                          disabled={actionLoading === `${container.id}-start`}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {container.state === "running" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleContainerAction(container.id, "stop")}
                          disabled={actionLoading === `${container.id}-stop`}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleContainerAction(container.id, "restart")}
                        disabled={actionLoading === `${container.id}-restart`}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {service.containers[0]?.ports && service.containers[0].ports.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {service.containers[0].ports.map((port: PortBinding, i: number) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {port.hostPort ? `${port.hostPort}:` : ""}{port.containerPort}/{port.protocol}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

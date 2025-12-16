"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContainersStore, useContainerStatsStore } from "@/stores/containers";

export default function MetricsPage() {
  const { containers, fetchContainers } = useContainersStore();
  const { stats, fetchStats } = useContainerStatsStore();
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  useEffect(() => {
    if (selectedContainer) {
      setIsLoading(true);
      fetchStats(selectedContainer).finally(() => setIsLoading(false));

      const interval = setInterval(() => {
        fetchStats(selectedContainer);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedContainer, fetchStats]);

  const runningContainers = containers.filter((c) => c.state === "running");
  const currentStats = selectedContainer ? stats[selectedContainer] : null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metrics</h2>
          <p className="text-muted-foreground">
            Container resource usage and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select container" />
            </SelectTrigger>
            <SelectContent>
              {runningContainers.map((container) => (
                <SelectItem key={container.id} value={container.id}>
                  {container.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => selectedContainer && fetchStats(selectedContainer)}
            disabled={!selectedContainer || isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {!selectedContainer ? (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Container</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Choose a running container from the dropdown to view its resource
              usage metrics
            </p>
          </CardContent>
        </Card>
      ) : !currentStats ? (
        <Card className="bg-card/50">
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {(currentStats.cpuPercentNormalized ?? currentStats.cpuPercent).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {currentStats.cpuCores || 1} core{(currentStats.cpuCores || 1) !== 1 ? 's' : ''}
                  </div>
                </div>
                <Progress
                  value={Math.min(currentStats.cpuPercentNormalized ?? currentStats.cpuPercent, 100)}
                  className="mt-2 h-2"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  Total: {currentStats.cpuPercent.toFixed(1)}% ({(currentStats.cpuPercent / 100).toFixed(2)} cores used)
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {currentStats.memoryPercent.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatBytes(currentStats.memoryUsage)} /{" "}
                  {formatBytes(currentStats.memoryLimit)}
                </div>
                <Progress
                  value={currentStats.memoryPercent}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Network I/O
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RX:</span>
                    <span className="font-medium">
                      {formatBytes(currentStats.networkRxBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TX:</span>
                    <span className="font-medium">
                      {formatBytes(currentStats.networkTxBytes)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Block I/O
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Read:</span>
                    <span className="font-medium">
                      {formatBytes(currentStats.blockReadBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Write:</span>
                    <span className="font-medium">
                      {formatBytes(currentStats.blockWriteBytes)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Process Information</CardTitle>
              <CardDescription>Container process details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">PIDs</p>
                  <p className="text-2xl font-bold">{currentStats.pids}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Memory (Absolute)
                  </p>
                  <p className="text-2xl font-bold">
                    {formatBytes(currentStats.memoryUsage)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Memory Limit</p>
                  <p className="text-2xl font-bold">
                    {formatBytes(currentStats.memoryLimit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

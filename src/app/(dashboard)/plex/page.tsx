"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PlexStatus {
  currentStatus: {
    isHealthy: boolean;
    mediaAvailable: boolean;
    timestamp: Date;
    consecutiveFailures: number;
    unavailableLibraries: string[];
    error?: string;
  } | null;
  statistics: {
    totalChecks: number;
    healthyChecks: number;
    uptimePercent: number;
    restartCount: number;
    period: {
      hours: number;
      from: string;
      to: string;
    };
  };
  recentLogs: Array<{
    id: string;
    timestamp: Date;
    isHealthy: boolean;
    mediaAvailable: boolean;
    error?: string;
    librariesChecked: number;
    unavailableLibraries: string[];
    consecutiveFailures: number;
    actionTaken?: string;
    restartedContainers?: string[];
  }>;
}

export default function PlexMonitorPage() {
  const [status, setStatus] = useState<PlexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/plex/status?hours=24");
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch Plex status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerManualCheck = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/plex/monitor");
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || "Failed to trigger manual check");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Error Loading Plex Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchStatus} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Plex Monitor Not Configured</CardTitle>
            <CardDescription>
              Configure PLEX_URL and PLEX_TOKEN environment variables to enable monitoring.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { currentStatus, statistics, recentLogs } = status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plex Monitor</h1>
          <p className="text-muted-foreground">
            Monitor Plex media availability and automatic container restarts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={triggerManualCheck}
            disabled={refreshing}
          >
            <Activity className="h-4 w-4 mr-2" />
            Manual Check
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            {currentStatus?.isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStatus?.isHealthy ? "Healthy" : "Unhealthy"}
            </div>
            {currentStatus && (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(currentStatus.timestamp), { addSuffix: true })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.uptimePercent.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {statistics.healthyChecks} / {statistics.totalChecks} checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consecutive Failures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStatus?.consecutiveFailures || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStatus?.consecutiveFailures && currentStatus.consecutiveFailures > 0
                ? "Action may be triggered soon"
                : "No failures"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Restarts (24h)</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.restartCount}</div>
            <p className="text-xs text-muted-foreground">Container restarts triggered</p>
          </CardContent>
        </Card>
      </div>

      {currentStatus && !currentStatus.mediaAvailable && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Media Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentStatus.unavailableLibraries.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Unavailable Libraries:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStatus.unavailableLibraries.map((lib) => (
                      <Badge key={lib} variant="destructive">
                        {lib}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentStatus.error && (
                <div>
                  <p className="text-sm font-medium mb-1">Error:</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {currentStatus.error}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 20 monitoring checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {log.isHealthy ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {log.isHealthy ? "Healthy" : "Unhealthy"} - {log.librariesChecked} libraries checked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.actionTaken === "restart" && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Restarted
                    </Badge>
                  )}
                  {log.consecutiveFailures > 0 && (
                    <Badge variant="secondary">
                      {log.consecutiveFailures} failures
                    </Badge>
                  )}
                  {log.unavailableLibraries.length > 0 && (
                    <Badge variant="destructive">
                      {log.unavailableLibraries.length} unavailable
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

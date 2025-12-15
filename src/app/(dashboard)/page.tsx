"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Layers,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useContainersStore } from "@/stores/containers";

interface DockerEvent {
  type: string;
  action: string;
  actor: {
    id: string;
    name?: string;
    attributes: Record<string, string>;
  };
  time: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  start: <Play className="h-3 w-3 text-green-500" />,
  stop: <Square className="h-3 w-3 text-red-500" />,
  die: <XCircle className="h-3 w-3 text-red-500" />,
  kill: <XCircle className="h-3 w-3 text-red-500" />,
  restart: <RotateCcw className="h-3 w-3 text-orange-500" />,
  create: <CheckCircle2 className="h-3 w-3 text-blue-500" />,
  destroy: <Trash2 className="h-3 w-3 text-gray-500" />,
  pull: <Download className="h-3 w-3 text-blue-500" />,
};

export default function OverviewPage() {
  const { containers, stacks, isLoading, error, fetchContainers, fetchStacks } =
    useContainersStore();
  const [events, setEvents] = useState<DockerEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/docker/events");
      const data = await response.json();
      if (data.success && data.data) {
        setEvents(data.data.slice(0, 10));
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    fetchStacks();
    fetchEvents();

    const interval = setInterval(() => {
      fetchContainers();
      fetchStacks();
      fetchEvents();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchContainers, fetchStacks]);

  const runningContainers = containers.filter((c) => c.state === "running");
  const stoppedContainers = containers.filter((c) => c.state === "exited");
  const unhealthyContainers = containers.filter(
    (c) => c.healthStatus === "unhealthy"
  );
  const restartingContainers = containers.filter(
    (c) => c.state === "restarting"
  );

  const stats = [
    {
      title: "Running",
      value: runningContainers.length,
      total: containers.length,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Stopped",
      value: stoppedContainers.length,
      total: containers.length,
      icon: XCircle,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
    },
    {
      title: "Unhealthy",
      value: unhealthyContainers.length,
      total: containers.length,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Restarting",
      value: restartingContainers.length,
      total: containers.length,
      icon: RefreshCw,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-sm text-muted-foreground">
                  / {stat.total}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Stacks
              </CardTitle>
              <CardDescription>Docker Compose projects</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/stacks">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading && stacks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading stacks...
              </div>
            ) : stacks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No stacks detected
              </div>
            ) : (
              <div className="space-y-3">
                {stacks.slice(0, 5).map((stack) => (
                  <Link
                    key={stack.name}
                    href={`/stacks/${stack.name}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{stack.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stack.serviceCount} services
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stack.unhealthyCount > 0 && (
                        <span className="text-xs text-red-500">
                          {stack.unhealthyCount} unhealthy
                        </span>
                      )}
                      <span className="text-sm text-green-500">
                        {stack.runningCount}/{stack.serviceCount} running
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Container className="h-5 w-5" />
                Recent Containers
              </CardTitle>
              <CardDescription>Latest container activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/containers">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading && containers.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading containers...
              </div>
            ) : containers.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No containers found
              </div>
            ) : (
              <div className="space-y-3">
                {containers.slice(0, 5).map((container) => (
                  <Link
                    key={container.id}
                    href={`/containers/${container.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Container className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{container.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {container.image}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={container.state}
                      healthStatus={container.healthStatus}
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unhealthyContainers.length > 0 ? (
                unhealthyContainers.map((container) => (
                  <div
                    key={container.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{container.name}</p>
                      <p className="text-xs text-muted-foreground">Unhealthy</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  All systems healthy
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Clock className="h-4 w-4 mr-2" />
                No recent events
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event, idx) => (
                  <div
                    key={`${event.actor.id}-${event.time}-${idx}`}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-sm"
                  >
                    {eventIcons[event.action] || <Activity className="h-3 w-3" />}
                    <span className="font-medium truncate max-w-[100px]">
                      {event.actor.name || event.actor.id.slice(0, 12)}
                    </span>
                    <span className="text-muted-foreground">{event.action}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(event.time).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/logs">
                View Logs
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/alerts">
                Configure Alerts
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/settings">
                Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

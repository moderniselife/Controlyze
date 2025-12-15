"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Container,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContainersStore } from "@/stores/containers";

export default function StacksPage() {
  const { stacks, standalone, isLoading, fetchStacks } = useContainersStore();

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stacks</h2>
          <p className="text-muted-foreground">
            Docker Compose projects and standalone containers
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchStacks()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {isLoading && stacks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stacks.map((stack) => (
            <Link key={stack.name} href={`/stacks/${stack.name}`}>
              <Card className="bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{stack.name}</CardTitle>
                        <CardDescription>
                          {stack.serviceCount} services
                        </CardDescription>
                      </div>
                    </div>
                    {stack.unhealthyCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-500 border-red-500/20"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stack.unhealthyCount} unhealthy
                      </Badge>
                    ) : stack.runningCount === stack.serviceCount ? (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-500 border-green-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Running</span>
                    <span className="font-medium text-green-500">
                      {stack.runningCount} / {stack.serviceCount}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {stack.services.slice(0, 4).map((service) => (
                      <Badge
                        key={service.name}
                        variant="secondary"
                        className="text-xs"
                      >
                        {service.name}
                      </Badge>
                    ))}
                    {stack.services.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{stack.services.length - 4} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {standalone.length > 0 && (
            <Card className="bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
                    <Container className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Standalone</CardTitle>
                    <CardDescription>
                      {standalone.length} containers
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Running</span>
                  <span className="font-medium text-green-500">
                    {standalone.filter((c) => c.state === "running").length} /{" "}
                    {standalone.length}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {standalone.slice(0, 4).map((container) => (
                    <Badge
                      key={container.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {container.name}
                    </Badge>
                  ))}
                  {standalone.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{standalone.length - 4} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {stacks.length === 0 && standalone.length === 0 && !isLoading && (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No stacks found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No Docker Compose stacks or containers were detected. Make sure
              Docker is running and accessible.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

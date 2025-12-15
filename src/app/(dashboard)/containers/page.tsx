"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Search,
  Filter,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useContainersStore } from "@/stores/containers";
import { toast } from "sonner";

export default function ContainersPage() {
  const { containers, stacks, isLoading, fetchContainers, fetchStacks } =
    useContainersStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stackFilter, setStackFilter] = useState("all");

  useEffect(() => {
    fetchContainers();
    fetchStacks();
  }, [fetchContainers, fetchStacks]);

  const filteredContainers = containers.filter((container) => {
    const matchesSearch =
      container.name.toLowerCase().includes(search.toLowerCase()) ||
      container.image.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || container.state === statusFilter;
    const matchesStack =
      stackFilter === "all" ||
      (stackFilter === "standalone"
        ? !container.stackName
        : container.stackName === stackFilter);
    return matchesSearch && matchesStatus && matchesStack;
  });

  const handleAction = async (
    containerId: string,
    action: "start" | "stop" | "restart"
  ) => {
    try {
      const response = await fetch(
        `/api/docker/containers/${containerId}/${action}`,
        { method: "POST" }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(`Container ${action}ed successfully`);
        fetchContainers();
      } else {
        toast.error(data.error || `Failed to ${action} container`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} container`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search containers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="exited">Exited</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="restarting">Restarting</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stackFilter} onValueChange={setStackFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Stack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stacks</SelectItem>
              <SelectItem value="standalone">Standalone</SelectItem>
              {stacks.map((stack) => (
                <SelectItem key={stack.name} value={stack.name}>
                  {stack.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchContainers()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Containers ({filteredContainers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Stack</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && containers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading containers...
                  </TableCell>
                </TableRow>
              ) : filteredContainers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No containers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContainers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell>
                      <Link
                        href={`/containers/${container.id}`}
                        className="font-medium hover:underline"
                      >
                        {container.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {container.image}
                    </TableCell>
                    <TableCell>
                      {container.stackName ? (
                        <Link
                          href={`/stacks/${container.stackName}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {container.stackName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          standalone
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={container.state}
                        healthStatus={container.healthStatus}
                      />
                    </TableCell>
                    <TableCell>
                      {container.ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {container.ports.slice(0, 2).map((port, i) => (
                            <span
                              key={i}
                              className="text-xs bg-muted px-1.5 py-0.5 rounded"
                            >
                              {port.hostPort || port.containerPort}
                            </span>
                          ))}
                          {container.ports.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{container.ports.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleAction(container.id, "start")}
                            disabled={container.state === "running"}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction(container.id, "stop")}
                            disabled={container.state !== "running"}
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(container.id, "restart")
                            }
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restart
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

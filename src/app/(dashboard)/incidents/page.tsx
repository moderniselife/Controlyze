"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Clock,
  MessageSquare,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IncidentStatusBadge, SeverityBadge } from "@/components/dashboard/status-badge";

interface Incident {
  id: string;
  title: string;
  description: string;
  status: "open" | "investigating" | "mitigated" | "resolved";
  severity: "info" | "warning" | "critical";
  affectedServices: string[];
  createdAt: string;
  updatedAt: string;
  ticketId?: string;
  ticketUrl?: string;
}

const mockIncidents: Incident[] = [
  {
    id: "inc-001",
    title: "Plex container unhealthy",
    description: "Plex media server is reporting unhealthy status due to transcoder issues",
    status: "investigating",
    severity: "warning",
    affectedServices: ["plex", "tunarr"],
    createdAt: "2024-12-15T10:30:00Z",
    updatedAt: "2024-12-15T10:45:00Z",
    ticketId: "LIN-123",
    ticketUrl: "https://linear.app/team/LIN-123",
  },
  {
    id: "inc-002",
    title: "High memory usage on prowlarr",
    description: "Prowlarr indexer is consuming excessive memory",
    status: "open",
    severity: "critical",
    affectedServices: ["prowlarr"],
    createdAt: "2024-12-15T09:00:00Z",
    updatedAt: "2024-12-15T09:00:00Z",
  },
  {
    id: "inc-003",
    title: "Overseerr restart loop",
    description: "Overseerr restarted 5 times in the last hour",
    status: "resolved",
    severity: "warning",
    affectedServices: ["overseerr"],
    createdAt: "2024-12-14T15:00:00Z",
    updatedAt: "2024-12-14T16:30:00Z",
    ticketId: "LIN-120",
    ticketUrl: "https://linear.app/team/LIN-120",
  },
];

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filteredIncidents = mockIncidents.filter((incident) => {
    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity =
      severityFilter === "all" || incident.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const openIncidents = mockIncidents.filter(
    (i) => i.status === "open" || i.status === "investigating"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Incidents</h2>
          <p className="text-muted-foreground">
            Track and manage service incidents
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Incident
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openIncidents}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {mockIncidents.filter((i) => i.severity === "critical").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investigating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {mockIncidents.filter((i) => i.status === "investigating").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {mockIncidents.filter((i) => i.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="mitigated">Mitigated</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredIncidents.map((incident) => (
          <Card key={incident.id} className="bg-card/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      incident.severity === "critical"
                        ? "bg-red-500/10"
                        : incident.severity === "warning"
                        ? "bg-yellow-500/10"
                        : "bg-blue-500/10"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        incident.severity === "critical"
                          ? "text-red-500"
                          : incident.severity === "warning"
                          ? "text-yellow-500"
                          : "text-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {incident.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {incident.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IncidentStatusBadge status={incident.status} />
                  <SeverityBadge severity={incident.severity} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {incident.affectedServices.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {incident.ticketId && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={incident.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {incident.ticketId}
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Notes
                  </Button>
                  <Button size="sm">View Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

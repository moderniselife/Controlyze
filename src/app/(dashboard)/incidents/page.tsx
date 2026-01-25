"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Clock,
  MessageSquare,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IncidentStatusBadge, SeverityBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "investigating" | "mitigated" | "resolved";
  severity: "info" | "warning" | "critical";
  affectedContainers: string[];
  affectedStacks: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "warning",
    affectedContainers: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchIncidents();
  }, [currentPage, itemsPerPage, statusFilter, severityFilter]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: statusFilter,
        severity: severityFilter,
      });
      const response = await fetch(`/api/incidents?${params}`);
      const data = await response.json();
      if (data.success) {
        setIncidents(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
      }
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        severity: formData.severity,
        status: "open",
        affectedContainers: formData.affectedContainers ? formData.affectedContainers.split(",").map(s => s.trim()) : [],
      };

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Incident created");
        setDialogOpen(false);
        setFormData({ title: "", description: "", severity: "warning", affectedContainers: "" });
        fetchIncidents();
      } else {
        toast.error(data.error || "Failed to create incident");
      }
    } catch {
      toast.error("Failed to create incident");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Status updated to ${status}`);
        fetchIncidents();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedIncidents.map((i) => i.id)));
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) {
      toast.error("No incidents selected");
      return;
    }
    setIsBulkUpdating(true);
    try {
      const response = await fetch("/api/incidents/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Updated ${selectedIds.size} incident(s) to ${status}`);
        setSelectedIds(new Set());
        fetchIncidents();
      } else {
        toast.error(data.error || "Failed to update incidents");
      }
    } catch {
      toast.error("Failed to update incidents");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No incidents selected");
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} incident(s)? This cannot be undone.`)) {
      return;
    }
    setIsBulkUpdating(true);
    try {
      const response = await fetch("/api/incidents/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${selectedIds.size} incident(s)`);
        setSelectedIds(new Set());
        fetchIncidents();
      } else {
        toast.error(data.error || "Failed to delete incidents");
      }
    } catch {
      toast.error("Failed to delete incidents");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Since we're using server-side pagination, incidents are already filtered and paginated
  const paginatedIncidents = incidents;
  
  const openIncidents = incidents.filter(
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Incident</DialogTitle>
              <DialogDescription>
                Log a new incident to track and resolve
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Incident title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the incident"
                />
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="affected">Affected Containers (comma-separated)</Label>
                <Input
                  id="affected"
                  value={formData.affectedContainers}
                  onChange={(e) => setFormData({ ...formData, affectedContainers: e.target.value })}
                  placeholder="plex, overseerr"
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSaving || !formData.title}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              {incidents.filter((i) => i.severity === "critical").length}
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
              {incidents.filter((i) => i.status === "investigating").length}
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
              {incidents.filter((i) => i.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
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
          <Button
            variant={statusFilter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            {statusFilter === "resolved" ? "Show All" : "Show Resolved"}
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Select
              value=""
              onValueChange={(value) => bulkUpdateStatus(value)}
              disabled={isBulkUpdating}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Set status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Mark Open</SelectItem>
                <SelectItem value="investigating">Mark Investigating</SelectItem>
                <SelectItem value="mitigated">Mark Mitigated</SelectItem>
                <SelectItem value="resolved">Mark Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="sm"
              onClick={bulkDelete}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Select All */}
      {paginatedIncidents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === paginatedIncidents.length && paginatedIncidents.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span
              className="cursor-pointer hover:text-foreground"
              onClick={toggleSelectAll}
            >
              Select all {paginatedIncidents.length} on this page
            </span>
          </div>
          <div className="text-xs">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} incidents
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {paginatedIncidents.map((incident) => (
          <Card key={incident.id} className={`bg-card/50 ${selectedIds.has(incident.id) ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedIds.has(incident.id)}
                    onCheckedChange={() => toggleSelect(incident.id)}
                    className="mt-1"
                  />
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
                    {incident.affectedContainers.map((container: string) => (
                      <Badge key={container} variant="secondary" className="text-xs">
                        {container}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={incident.status}
                    onValueChange={(value) => updateStatus(incident.id, value)}
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

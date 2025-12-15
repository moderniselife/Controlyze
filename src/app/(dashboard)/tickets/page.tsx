"use client";

import { useState } from "react";
import {
  Ticket,
  ExternalLink,
  RefreshCw,
  Filter,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TicketInfo {
  id: string;
  externalId: string;
  externalUrl: string;
  provider: string;
  title: string;
  status: string;
  priority: string;
  incidentId: string;
  createdAt: string;
  lastSynced: string;
}

const mockTickets: TicketInfo[] = [
  {
    id: "1",
    externalId: "LIN-123",
    externalUrl: "https://linear.app/team/LIN-123",
    provider: "linear",
    title: "Plex container unhealthy",
    status: "In Progress",
    priority: "High",
    incidentId: "inc-001",
    createdAt: "2024-12-15T10:30:00Z",
    lastSynced: "2024-12-15T11:00:00Z",
  },
  {
    id: "2",
    externalId: "LIN-120",
    externalUrl: "https://linear.app/team/LIN-120",
    provider: "linear",
    title: "Overseerr restart loop",
    status: "Done",
    priority: "Medium",
    incidentId: "inc-003",
    createdAt: "2024-12-14T15:00:00Z",
    lastSynced: "2024-12-14T18:00:00Z",
  },
];

const statusIcons: Record<string, React.ReactNode> = {
  "In Progress": <Clock className="h-3 w-3" />,
  Done: <Check className="h-3 w-3" />,
  Todo: <AlertCircle className="h-3 w-3" />,
};

const statusColors: Record<string, string> = {
  "In Progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Done: "bg-green-500/10 text-green-500 border-green-500/20",
  Todo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  High: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    const matchesProvider =
      providerFilter === "all" || ticket.provider === providerFilter;
    return matchesStatus && matchesProvider;
  });

  const handleSync = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <p className="text-muted-foreground">
            Track tickets created from incidents
          </p>
        </div>
        <Button onClick={handleSync} disabled={isRefreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Sync Status
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockTickets.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {mockTickets.filter((t) => t.status !== "Done").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {mockTickets.filter((t) => t.status === "Done").length}
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
            <SelectItem value="Todo">Todo</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.externalId}
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[ticket.status] || ""}
                      >
                        {statusIcons[ticket.status]}
                        <span className="ml-1">{ticket.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={priorityColors[ticket.priority] || ""}
                      >
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {ticket.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(ticket.lastSynced).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={ticket.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
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

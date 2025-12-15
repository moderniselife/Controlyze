"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  RefreshCw,
  Container,
  Image,
  Network,
  HardDrive,
  Filter,
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

const eventTypeIcons: Record<string, React.ReactNode> = {
  container: <Container className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  volume: <HardDrive className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  start: "text-green-500 bg-green-500/10",
  stop: "text-red-500 bg-red-500/10",
  die: "text-red-500 bg-red-500/10",
  kill: "text-red-500 bg-red-500/10",
  restart: "text-yellow-500 bg-yellow-500/10",
  create: "text-blue-500 bg-blue-500/10",
  destroy: "text-gray-500 bg-gray-500/10",
  pull: "text-purple-500 bg-purple-500/10",
  push: "text-purple-500 bg-purple-500/10",
  attach: "text-blue-500 bg-blue-500/10",
  detach: "text-gray-500 bg-gray-500/10",
  health_status: "text-yellow-500 bg-yellow-500/10",
};

export default function EventsPage() {
  const [events, setEvents] = useState<DockerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const since = Math.floor(Date.now() / 1000) - 3600;
      const response = await fetch(
        `/api/docker/events?since=${since}`
      );
      const data = await response.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter(
    (event) => typeFilter === "all" || event.type === typeFilter
  );

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Events</h2>
          <p className="text-muted-foreground">
            Docker events timeline (last hour)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="container">Container</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Timeline ({filteredEvents.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {isLoading && events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4" />
                <p>No events in the last hour</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
                  <div
                    key={`${event.actor.id}-${event.time}-${index}`}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-background/50"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        actionColors[event.action] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {eventTypeIcons[event.type] || (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {event.actor.name || event.actor.id.slice(0, 12)}
                        </span>
                        <Badge
                          variant="outline"
                          className={actionColors[event.action] || ""}
                        >
                          {event.action}
                        </Badge>
                        <Badge variant="secondary">{event.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatTime(event.time)}
                      </p>
                      {event.actor.attributes.image && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Image: {event.actor.attributes.image}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

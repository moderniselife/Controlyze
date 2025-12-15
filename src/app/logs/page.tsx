"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Download,
  Pause,
  Play,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useContainersStore } from "@/stores/containers";
import type { LogLine } from "@/types";

export default function LogsPage() {
  const { containers, fetchContainers } = useContainersStore();
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [tailLines, setTailLines] = useState("100");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const fetchLogs = useCallback(async () => {
    if (!selectedContainer) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/docker/containers/${selectedContainer}/logs?tail=${tailLines}`
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.lines);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedContainer, tailLines]);

  useEffect(() => {
    if (selectedContainer) {
      fetchLogs();
    }
  }, [selectedContainer, fetchLogs]);

  useEffect(() => {
    if (!selectedContainer || isPaused) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedContainer, isPaused, fetchLogs]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const content = filteredLogs
      .map((log) => `${log.timestamp || ""} ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${selectedContainer}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogLineColor = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("error") || lower.includes("fatal")) {
      return "text-red-400";
    }
    if (lower.includes("warn")) {
      return "text-yellow-400";
    }
    if (lower.includes("info")) {
      return "text-blue-400";
    }
    if (lower.includes("debug")) {
      return "text-gray-500";
    }
    return "text-foreground";
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select container" />
            </SelectTrigger>
            <SelectContent>
              {containers
                .filter((c) => c.state === "running")
                .map((container) => (
                  <SelectItem key={container.id} value={container.id}>
                    {container.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={tailLines} onValueChange={setTailLines}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 lines</SelectItem>
              <SelectItem value="100">100 lines</SelectItem>
              <SelectItem value="500">500 lines</SelectItem>
              <SelectItem value="1000">1000 lines</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="timestamps"
              checked={showTimestamps}
              onCheckedChange={setShowTimestamps}
            />
            <Label htmlFor="timestamps" className="text-sm">
              Timestamps
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="autoscroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            />
            <Label htmlFor="autoscroll" className="text-sm">
              Auto-scroll
            </Label>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={isLoading || !selectedContainer}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLogs([])}
            disabled={logs.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-card/50 flex-1 h-full">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4" />
              Logs
              {search && (
                <Badge variant="secondary" className="text-xs">
                  {filteredLogs.length} matches
                </Badge>
              )}
            </CardTitle>
            {isPaused && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                Paused
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea
            ref={scrollRef}
            className="h-[calc(100vh-18rem)] font-mono text-sm"
          >
            {!selectedContainer ? (
              <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                Select a container to view logs
              </div>
            ) : isLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                No logs found
              </div>
            ) : (
              <div className="p-4 space-y-0.5">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 py-0.5 px-2 hover:bg-muted/50 rounded ${
                      log.stream === "stderr" ? "bg-red-500/5" : ""
                    }`}
                  >
                    {showTimestamps && log.timestamp && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    <span
                      className={`flex-1 break-all ${getLogLineColor(
                        log.message
                      )}`}
                    >
                      {log.message}
                    </span>
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

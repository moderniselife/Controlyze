"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, RefreshCw, Bell, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/stacks": "Stacks",
  "/containers": "Containers",
  "/logs": "Logs",
  "/metrics": "Metrics",
  "/events": "Events",
  "/alerts": "Alerts",
  "/incidents": "Incidents",
  "/tickets": "Tickets",
  "/connections": "Connections",
  "/integrations": "Integrations",
  "/settings": "Settings",
  "/setup": "Setup",
};

export function Header() {
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const title = pageTitles[pathname] || "Controlyze";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    window.location.reload();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6">
      <SidebarTrigger className="-ml-2" />

      <div className="flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:flex">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 pl-9 pr-12 bg-muted/50"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="font-medium">Container unhealthy</span>
                <span className="text-xs text-muted-foreground">
                  plex is unhealthy - 2 minutes ago
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="font-medium">High memory usage</span>
                <span className="text-xs text-muted-foreground">
                  overseerr at 92% memory - 5 minutes ago
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="font-medium">Restart detected</span>
                <span className="text-xs text-muted-foreground">
                  prowlarr restarted 3 times - 10 minutes ago
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

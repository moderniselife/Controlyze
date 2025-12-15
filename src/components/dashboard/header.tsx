"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, RefreshCw, Bell, Command, Box, Layers, AlertTriangle, Activity, Settings, Plug, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  page: <FileText className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
  stack: <Layers className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  incident: <AlertTriangle className="h-4 w-4" />,
  event: <Activity className="h-4 w-4" />,
  setting: <Settings className="h-4 w-4" />,
  integration: <Plug className="h-4 w-4" />,
};

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
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const title = pageTitles[pathname] || "Controlyze";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    window.location.reload();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search containers, stacks, alerts..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Searching..." : "No results found."}
          </CommandEmpty>
          {results.length > 0 && (
            <>
              {["page", "container", "stack", "alert", "incident", "integration", "setting"].map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;
                return (
                  <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}>
                    {typeResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.title} ${result.subtitle || ""}`}
                        onSelect={() => handleSelect(result.url)}
                      >
                        {typeIcons[result.type] || <FileText className="h-4 w-4" />}
                        <div className="ml-2 flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>

      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6">
        <SidebarTrigger className="-ml-2" />

        <div className="flex-1">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="relative h-9 w-64 justify-start text-sm text-muted-foreground hidden md:flex"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Search...
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>

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
    </>
  );
}

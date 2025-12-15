"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Container,
  ScrollText,
  Activity,
  Calendar,
  Bell,
  AlertTriangle,
  Ticket,
  Settings,
  Plug,
  Cog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  {
    group: "Dashboard",
    items: [
      { title: "Overview", href: "/", icon: LayoutDashboard },
      { title: "Stacks", href: "/stacks", icon: Layers },
      { title: "Containers", href: "/containers", icon: Container },
    ],
  },
  {
    group: "Observability",
    items: [
      { title: "Logs", href: "/logs", icon: ScrollText },
      { title: "Metrics", href: "/metrics", icon: Activity },
      { title: "Events", href: "/events", icon: Calendar },
    ],
  },
  {
    group: "Reliability",
    items: [
      { title: "Alerts", href: "/alerts", icon: Bell },
      { title: "Incidents", href: "/incidents", icon: AlertTriangle },
      { title: "Tickets", href: "/tickets", icon: Ticket },
    ],
  },
  {
    group: "Admin",
    items: [
      { title: "Connections", href: "/connections", icon: Plug },
      { title: "Integrations", href: "/integrations", icon: Cog },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Controlyze
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {navItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href))
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-6 py-4">
        <div className="text-xs text-muted-foreground">
          Controlyze v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

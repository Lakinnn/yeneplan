import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { CalendarDays, CheckCheck, Compass, Lightbulb, LogOut, PanelLeft, Sparkles } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: Compass, label: "Today", anchor: "today" },
  { icon: Lightbulb, label: "Vision board", anchor: "visions" },
  { icon: CalendarDays, label: "Monthly map", anchor: "month" },
  { icon: CheckCheck, label: "Year dashboard", anchor: "dashboard" },
  { icon: Sparkles, label: "AI coach", anchor: "coach" },
];

const SIDEBAR_WIDTH_KEY = "yeneplan-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 210;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()), [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <>{children}</>;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = e.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const up = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const jumpTo = (anchor: string) => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-[88px] justify-center px-3">
            <div className="flex items-center gap-3 w-full">
              <button onClick={toggleSidebar} className="brand-mark shrink-0" aria-label="Toggle navigation"><span>✦</span></button>
              {!isCollapsed && <div className="min-w-0"><p className="font-display text-lg leading-none tracking-tight">YenePlan</p><p className="text-[10px] text-sidebar-foreground/55 uppercase tracking-[0.18em] mt-1">2019 with intention</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2">
            <div className="px-3 pb-2 pt-4 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">Your year, your rules</div>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.anchor}>
                  <SidebarMenuButton onClick={() => jumpTo(item.anchor)} tooltip={item.label} className="h-11 rounded-xl font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary">
                    <item.icon className="h-[17px] w-[17px]" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">{user?.name?.charAt(0).toUpperCase() || "Y"}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold truncate leading-none">{user?.name || "Planner"}</p><p className="text-[11px] text-sidebar-foreground/50 truncate mt-1.5">Private workspace</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
      </div>
      <SidebarInset>
        <div className="md:hidden flex border-b border-border/60 h-14 items-center gap-3 bg-background/90 px-4 backdrop-blur sticky top-0 z-40"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="font-display text-lg">YenePlan</span><span className="text-xs text-muted-foreground ml-auto">2019</span></div>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}

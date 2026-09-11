import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { CalendarDays, CheckCheck, ClipboardCheck, Compass, Lightbulb, LogOut, Moon, Settings2, Sparkles, Sun, Users } from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: Compass, label: "Dashboard", path: "/" },
  { icon: CheckCheck, label: "Today", path: "/today" },
  { icon: Lightbulb, label: "Vision board", path: "/visions" },
  { icon: CalendarDays, label: "Monthly map", path: "/month" },
  { icon: Sparkles, label: "Coach", path: "/coach" },
  { icon: Users, label: "Community", path: "/community" },
];
const SIDEBAR_WIDTH_KEY = "yeneplan-sidebar-width";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || 240);
  const { loading, user } = useAuth();
  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)), [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="min-h-screen grid place-items-center"><div className="text-center"><p className="font-display text-3xl">YenePlan</p><p className="text-muted-foreground mt-2">Sign in to open your private planning space.</p><Button className="mt-5 rounded-xl" onClick={() => startLogin()}>Sign in</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent>{children}</LayoutContent></SidebarProvider>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  return <><Sidebar collapsible="icon" className="border-r-0"><SidebarHeader className="h-[88px] justify-center px-3"><div className="flex items-center gap-4 w-full"><button onClick={toggleSidebar} className="brand-mark shrink-0" aria-label="Toggle navigation"><ClipboardCheck className="h-[18px] w-[18px]" /></button>{state !== "collapsed" && <div className="min-w-0 pl-0.5"><p className="font-display text-lg leading-none tracking-tight">YenePlan</p><p className="text-[10px] text-sidebar-foreground/55 uppercase tracking-[0.18em] mt-1">2019 with intention</p></div>}</div></SidebarHeader><SidebarContent className="px-2"><div className="px-3 pb-2 pt-4 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">Your year, your rules</div><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><Link href={item.path}><SidebarMenuButton isActive={location === item.path} tooltip={item.label} className="h-11 rounded-xl font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary"><item.icon className="h-[17px] w-[17px]" /><span>{item.label}</span></SidebarMenuButton></Link></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="p-3"><Link href="/settings"><SidebarMenuButton tooltip="Settings" className="w-full h-10 rounded-xl"><Settings2 className="h-4 w-4" /><span>Settings</span></SidebarMenuButton></Link><button onClick={toggleTheme} className="flex items-center gap-3 rounded-xl px-2 py-2 mt-1 w-full text-left hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center" aria-label="Toggle theme">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}<span className="text-sm group-data-[collapsible=icon]:hidden">{theme === "light" ? "Dark mode" : "Light mode"}</span></button><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-3 rounded-xl px-2 py-2 mt-2 hover:bg-sidebar-accent transition-colors w-full text-left"><Avatar className="h-9 w-9 border border-sidebar-border shrink-0"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">{user?.name?.charAt(0).toUpperCase() || "Y"}</AvatarFallback></Avatar><div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold truncate">{user?.name || "Planner"}</p><p className="text-[11px] text-sidebar-foreground/50 truncate mt-1">Private workspace</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset><div className="md:hidden flex border-b border-border/60 h-14 items-center gap-3 bg-background/90 px-4 backdrop-blur sticky top-0 z-40"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="font-display text-lg">YenePlan</span></div><main className="flex-1">{children}</main></SidebarInset></>;
}

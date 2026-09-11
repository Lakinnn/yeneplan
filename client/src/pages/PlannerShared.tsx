import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Circle, Moon, Sun, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

export const months = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagumen"];

export function usePlannerData() {
  const { isAuthenticated } = useAuth();
  const query = trpc.dashboard.get.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const utils = trpc.useUtils();
  return { ...query, utils, data: query.data, profile: query.data?.profile };
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description: string; action?: ReactNode }) {
  return <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8"><div><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">{eyebrow}</p><h1 className="font-display text-4xl md:text-5xl tracking-tight mt-2">{title}</h1><p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{description}</p></div>{action}</div>;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-xl bg-card/70" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button>;
}

export function StatusPill({ status }: { status: string }) {
  const label = status === "done" ? "Done" : status === "missed" ? "Missed" : status === "active" ? "In progress" : "Backlog";
  return <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-[0.1em] ${status === "done" ? "border-[#8bc29b] bg-[#e5f1e6] text-[#3d7a4c]" : status === "missed" ? "border-destructive/30 text-destructive" : "text-muted-foreground"}`}>{label}</Badge>;
}

export function PlanItem({ plan, onStatus, onDelete }: { plan: any; onStatus: (status: "active" | "done" | "missed") => void; onDelete?: () => void }) {
  return <div className={`group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3.5 ${plan.status === "done" ? "opacity-65" : ""}`}><button onClick={() => onStatus(plan.status === "done" ? "active" : "done")} className={`h-8 w-8 rounded-xl grid place-items-center border ${plan.status === "done" ? "bg-[#4d9163] border-[#4d9163] text-white" : "border-border bg-background hover:border-primary hover:text-primary"}`} aria-label={plan.status === "done" ? "Mark active" : "Mark done"}>{plan.status === "done" ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><p className={`font-medium truncate ${plan.status === "done" ? "line-through text-muted-foreground" : ""}`}>{plan.title}</p>{plan.detail && <p className="text-xs text-muted-foreground truncate mt-1">{plan.detail}</p>}</div><StatusPill status={plan.status} /><button onClick={() => onStatus(plan.status === "missed" ? "active" : "missed")} className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-primary transition-opacity">{plan.status === "missed" ? "reset" : "miss"}</button>{onDelete && <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity" aria-label={`Delete ${plan.title}`}><X className="h-4 w-4" /></button>}</div>;
}

export function AddPlan({ period, year, month, day, onAdded }: { period: "year" | "month" | "day"; year: number; month?: number; day?: number; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const create = trpc.plan.create.useMutation({ onSuccess: () => { setTitle(""); setDetail(""); onAdded(); } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; create.mutate({ period, title: title.trim(), detail: detail.trim() || null, priority, ethiopianYear: year, ethiopianMonth: period === "year" ? null : month ?? null, ethiopianDay: period === "day" ? day ?? null : null }); };
  return <form onSubmit={submit} className="flex flex-col md:flex-row gap-2 mt-5"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Add a ${period} move…`} className="bg-background/60 flex-1" /><Input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Why / how (optional)" className="bg-background/60 md:max-w-[230px]" /><Select value={priority} onValueChange={value => setPriority(value as typeof priority)}><SelectTrigger className="w-full md:w-[120px] bg-background/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select><Button type="submit" disabled={!title.trim() || create.isPending} className="rounded-xl">Add</Button></form>;
}

export function EmptyState({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{text}</p></div>; }

export function VisionCard({ vision, onDelete }: { vision: any; onDelete: () => void }) { return <Card className="lift overflow-hidden border-border/70 bg-card/80"><CardContent className="p-0"><div className="h-40 relative bg-[#f6ead2]">{vision.imageUrl ? <img src={vision.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-5xl opacity-70">{vision.emoji}</div>}<button onClick={onDelete} className="absolute right-3 top-3 h-8 w-8 rounded-xl bg-black/20 text-white grid place-items-center hover:bg-destructive" aria-label={`Delete ${vision.title}`}><Trash2 className="h-4 w-4" /></button></div><div className="p-5"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">{vision.category}</Badge><span className="text-xl">{vision.emoji}</span></div><h3 className="font-display text-2xl mt-3">{vision.title}</h3>{vision.reason && <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{vision.reason}</p>}</div></CardContent></Card>; }

export function LoadingPage() { return <div className="min-h-[70vh] grid place-items-center text-muted-foreground">Loading your private workspace…</div>; }

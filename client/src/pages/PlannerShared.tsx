import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Circle, Compass, Moon, Pencil, Sun, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

export const months = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagumen"];

export function usePlannerData() {
  const { isAuthenticated } = useAuth();
  const query = trpc.dashboard.get.useQuery(undefined, { enabled: Boolean(isAuthenticated) });
  const utils = trpc.useUtils();
  return { ...query, utils, data: query.data, profile: query.data?.profile };
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description: string; action?: ReactNode }) {
  return <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8"><div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">{eyebrow}</p><h1 className="font-display text-4xl md:text-[3.25rem] tracking-[-0.035em] mt-2 leading-[1.05]">{title}</h1><p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{description}</p></div><div className="flex items-center gap-2 self-start md:self-end"><ThemeToggle />{action}</div></div>;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-xl bg-card/70" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button>;
}

const priorityStyles: Record<string, string> = { low: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300", medium: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", high: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300" };

export function StatusPill({ status }: { status: string }) {
  const label = status === "done" ? "Done" : status === "missed" ? "Missed" : status === "active" ? "In progress" : "Backlog";
  return <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-[0.1em] ${status === "done" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : status === "missed" ? "border-destructive/30 text-destructive" : "text-muted-foreground"}`}>{label}</Badge>;
}

export function PlanItem({ plan, onStatus, onDelete }: { plan: any; onStatus: (status: "active" | "done" | "missed") => void; onDelete?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(plan.title);
  const [detail, setDetail] = useState(plan.detail || "");
  const [priority, setPriority] = useState(plan.priority || "medium");
  const utils = trpc.useUtils();
  const update = trpc.plan.update.useMutation({ onSuccess: () => { setEditing(false); void utils.dashboard.get.invalidate(); } });
  if (editing) return <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-2"><Input value={title} onChange={e => setTitle(e.target.value)} className="bg-background" aria-label="Task title" /><Input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Why / how" className="bg-background" aria-label="Task detail" /><div className="flex flex-wrap items-center gap-2"><div className="flex gap-1">{["low", "medium", "high"].map(value => <button type="button" key={value} onClick={() => setPriority(value)} className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${priority === value ? priorityStyles[value] : "border-border text-muted-foreground"}`}>{value}</button>)}</div><div className="ml-auto flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button type="button" size="sm" onClick={() => update.mutate({ id: plan.id, period: plan.period, ethiopianYear: plan.ethiopianYear, ethiopianMonth: plan.ethiopianMonth, ethiopianDay: plan.ethiopianDay, title: title.trim(), detail: detail.trim() || null, priority })} disabled={!title.trim() || update.isPending}>Save</Button></div></div></div>;
  return <div className={`group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3.5 ${plan.status === "done" ? "opacity-65" : ""}`}><button onClick={() => onStatus(plan.status === "done" ? "active" : "done")} className={`h-8 w-8 rounded-xl grid place-items-center border ${plan.status === "done" ? "bg-emerald-600 border-emerald-600 text-white" : "border-border bg-background hover:border-primary hover:text-primary"}`} aria-label={plan.status === "done" ? "Mark active" : "Mark done"}>{plan.status === "done" ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</button><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${plan.priority === "high" ? "bg-rose-500" : plan.priority === "low" ? "bg-sky-500" : "bg-amber-500"}`} title={`${plan.priority || "medium"} priority`} /><div className="min-w-0 flex-1"><p className={`font-medium truncate ${plan.status === "done" ? "line-through text-muted-foreground" : ""}`}>{plan.title}</p>{plan.detail && <p className="text-xs text-muted-foreground truncate mt-1">{plan.detail}</p>}</div><StatusPill status={plan.status} /><button onClick={() => onStatus(plan.status === "missed" ? "active" : "missed")} className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-primary transition-opacity">{plan.status === "missed" ? "reset" : "miss"}</button><button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" aria-label={`Edit ${plan.title}`}><Pencil className="h-4 w-4" /></button>{onDelete && <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity" aria-label={`Delete ${plan.title}`}><X className="h-4 w-4" /></button>}</div>;
}

export function AddPlan({ period, year, month, day, onAdded }: { period: "year" | "month" | "day"; year: number; month?: number; day?: number; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const create = trpc.plan.create.useMutation({ onSuccess: () => { setTitle(""); setDetail(""); onAdded(); } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; create.mutate({ period, title: title.trim(), detail: detail.trim() || null, priority, ethiopianYear: year, ethiopianMonth: period === "year" ? null : month ?? null, ethiopianDay: period === "day" ? day ?? null : null }); };
  return <form onSubmit={submit} className="flex flex-col md:flex-row gap-2 mt-5"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Add a ${period} move…`} className="bg-background flex-1" /><Input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Why / how (optional)" className="bg-background md:max-w-[230px]" /><div className="flex rounded-xl border border-input bg-background p-1 gap-1">{["low", "medium", "high"].map(value => <button type="button" key={value} onClick={() => setPriority(value as typeof priority)} className={`rounded-lg px-2 py-1 text-[11px] capitalize ${priority === value ? priorityStyles[value] : "text-muted-foreground"}`}>{value}</button>)}</div><Button type="submit" disabled={!title.trim() || create.isPending} className="rounded-xl">Add</Button></form>;
}

export function EmptyState({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{text}</p></div>; }

export function VisionCard({ vision, onDelete }: { vision: any; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(vision.title);
  const [reason, setReason] = useState(vision.reason || "");
  const [visionPlan, setVisionPlan] = useState(vision.visionPlan || "");
  const utils = trpc.useUtils();
  const update = trpc.vision.update.useMutation({ onSuccess: () => { setEditing(false); void utils.dashboard.get.invalidate(); } });
  if (editing) return <Card className="border-primary/40 bg-card"><CardContent className="p-5 space-y-3"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Vision title" /><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this matters" className="min-h-[90px] w-full rounded-xl border border-input bg-background p-3 text-sm outline-none" /><textarea value={visionPlan} onChange={e => setVisionPlan(e.target.value)} placeholder="Your plan for this vision" className="min-h-[110px] w-full rounded-xl border border-input bg-background p-3 text-sm outline-none" /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button disabled={!title.trim() || update.isPending} onClick={() => update.mutate({ id: vision.id, title: title.trim(), reason: reason.trim() || null, visionPlan: visionPlan.trim() || null, category: vision.category, emoji: vision.emoji || "◎", color: vision.color || "sun", imageUrl: vision.imageUrl, imageKey: vision.imageKey })}>Save vision</Button></div></CardContent></Card>;
  return <Card className="lift overflow-hidden border-border/70 bg-card"><CardContent className="p-0"><div className="h-40 relative bg-muted">{vision.imageUrl ? <img src={vision.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center"><Compass className="h-12 w-12 text-primary/70" /></div>}<button onClick={onDelete} className="absolute right-3 top-3 h-8 w-8 rounded-xl bg-black/25 text-white grid place-items-center hover:bg-destructive" aria-label={`Delete ${vision.title}`}><Trash2 className="h-4 w-4" /></button><button onClick={() => setEditing(true)} className="absolute right-12 top-3 h-8 w-8 rounded-xl bg-black/25 text-white grid place-items-center hover:bg-primary" aria-label={`Edit ${vision.title}`}><Pencil className="h-4 w-4" /></button></div><div className="p-5"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">{vision.category}</Badge><Compass className="h-5 w-5 text-primary" /></div><h3 className="font-display text-2xl mt-3">{vision.title}</h3>{vision.reason && <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{vision.reason}</p>}{vision.visionPlan && <div className="mt-4 rounded-xl bg-secondary/60 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-primary font-semibold">The plan</p><p className="text-sm mt-1 line-clamp-3">{vision.visionPlan}</p></div>}</div></CardContent></Card>;
}

export function LoadingPage() { return <div className="min-h-[70vh] grid place-items-center text-muted-foreground">Loading your private workspace…</div>; }

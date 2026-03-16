"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  Bot,
  BriefcaseBusiness,
  Flag,
  FolderTree,
  KanbanSquare,
  LayoutDashboard,
  Logs,
  PlayCircle,
  Settings2,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Build", href: "/build", icon: Sparkles },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Goal & MVP", href: "/goal", icon: Flag },
  { label: "Phases", href: "/phases", icon: BriefcaseBusiness },
  { label: "Features", href: "/features", icon: Blocks },
  { label: "Tasks", href: "/tasks", icon: FolderTree },
  { label: "Kanban", href: "/kanban", icon: KanbanSquare },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Workspace", href: "/workspace", icon: BriefcaseBusiness },
  { label: "Preview", href: "/preview", icon: PlayCircle },
  { label: "Logs", href: "/logs", icon: Logs },
] as const;

export function ProjectShell({
  projectId,
  projectName,
  projectStatus,
  currentFocus,
  children,
}: {
  projectId: string;
  projectName: string;
  projectStatus: string;
  currentFocus: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[32px] border border-white/60 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_90px_rgba(15,23,42,0.3)]">
          <div className="space-y-2 border-b border-white/10 pb-5">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                Clonable
              </span>
              Projects
            </Link>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {projectName}
              </h1>
            </div>
            <Badge tone="warm" className="bg-white/10 text-white ring-white/10">
              {projectStatus}
            </Badge>
          </div>

          <div className="mt-6 space-y-2">
            {navItems.map((item) => {
              const href = `/projects/${projectId}${item.href}`;
              const active =
                currentPath === href || currentPath.startsWith(`${href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                    active
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-[28px] bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/80">
              Current focus
            </p>
            <p className="mt-3 text-sm leading-6 text-white/80">{currentFocus}</p>
          </div>

          <Link
            href="/settings"
            className="mt-6 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
        </aside>

        <main className="pb-8">
          <div className="mb-6 rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  What matters now
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{currentFocus}</p>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                MVP boundary first, expansion later
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

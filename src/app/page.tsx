import Link from "next/link";
import { ArrowRight, CheckCircle2, GitBranch, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { listProjects } from "@/server/services/project-service";

export default function HomePage() {
  const projects = listProjects();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.94))] text-white">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-5">
              <Badge tone="warm" className="bg-white/10 text-white ring-white/10">
                Local-first hybrid AI builder
              </Badge>
              <div className="space-y-3">
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Build the MVP first. Keep the momentum visible.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-white/78">
                  Clonable helps a user turn an idea into a real working MVP by defining the
                  actual scope, structuring the work, coordinating specialized agents, and
                  keeping progress easy to understand inside a real repository workflow.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-white/80">
                <span className="rounded-full bg-white/8 px-4 py-2">
                  Stability over chaos
                </span>
                <span className="rounded-full bg-white/8 px-4 py-2">
                  ADHD-friendly clarity
                </span>
                <span className="rounded-full bg-white/8 px-4 py-2">
                  Real Git workspace execution
                </span>
              </div>
            </div>
            <div className="grid gap-4">
              <Card className="border-white/10 bg-white/6 text-white">
                <CardTitle className="text-white">Current foundation slice</CardTitle>
                <CardDescription className="mt-3 text-white/70">
                  Product definition, V1 PRD, architecture, database shape, and a working
                  dashboard shell are now the first committed vertical slice.
                </CardDescription>
              </Card>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  {
                    label: "Planning-first",
                    value: "MVP boundary before code",
                    icon: CheckCircle2,
                  },
                  {
                    label: "Repo-native",
                    value: "Git stays central",
                    icon: GitBranch,
                  },
                  {
                    label: "Useful agents",
                    value: "State-driven, not chaotic",
                    icon: Sparkles,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Card key={item.label} className="border-white/10 bg-white/6 text-white">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white/10 p-3">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-teal-200/80">
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm text-white/80">{item.value}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Projects
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950">
                Working foundation
              </h2>
            </div>
            <p className="max-w-lg text-right text-sm leading-6 text-slate-600">
              This scaffold starts with a demo project that exercises the planning model and
              route structure before persistence and live orchestration are added.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="grid gap-5">
              {projects.map((project) => (
                <Card key={project.id} className="relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.1),transparent_70%)]" />
                  <div className="relative space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <CardTitle>{project.name}</CardTitle>
                          <Badge tone="warm">{project.status}</Badge>
                        </div>
                        <CardDescription>{project.summary}</CardDescription>
                      </div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open project
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                          <span>Foundation progress</span>
                          <span>{project.progressPercent}%</span>
                        </div>
                        <ProgressBar value={project.progressPercent} />
                        <p className="text-sm leading-6 text-slate-600">{project.currentFocus}</p>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-950/3 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Current blockers
                        </p>
                        <p className="mt-3 text-3xl font-semibold text-slate-950">
                          {project.blockedTasks}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Blocked work is visible early so the next best tasks stay obvious.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card>
              <CardTitle>Foundation deliverables in this repo</CardTitle>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <p>1. Concise product definition and V1 PRD</p>
                <p>2. Proposed architecture and information architecture</p>
                <p>3. Database schema, agent design, and task lifecycle</p>
                <p>4. Phased implementation plan and executable app scaffold</p>
              </div>
              <Link
                href="/projects/clonable-v1"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                Explore the V1 workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

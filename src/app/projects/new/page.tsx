import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";
import { createProjectAction } from "@/features/projects/actions";

export default function NewProjectPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <PageIntro
          eyebrow="Create Project"
          title="Start with the idea, then define the real MVP"
          description="This first flow captures the idea, the audience, the constraints, and the stack preferences, then asks the planner to propose the smallest credible MVP."
          action={
            <Link
              href="/"
              className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              Back to projects
            </Link>
          }
        />

        <Card>
          <form action={createProjectAction} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Project name</span>
                <input
                  name="name"
                  required
                  placeholder="Clonable for local builders"
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Target user</span>
                <input
                  name="targetUser"
                  required
                  placeholder="Solo founders and indie hackers"
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-600"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Idea prompt</span>
              <textarea
                name="ideaPrompt"
                required
                rows={7}
                placeholder="Describe the product vision, the problem, and what a believable first MVP should accomplish."
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Constraints
                </span>
                <textarea
                  name="constraints"
                  rows={6}
                  placeholder={"One line per constraint\nMust be local-first\nUse boring stable tech"}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Stack preferences
                </span>
                <textarea
                  name="stackPreferences"
                  rows={6}
                  placeholder={"One line per preference\nNext.js\nTypeScript\nTailwind"}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
              <CardTitle className="text-base">What happens next</CardTitle>
              <CardDescription className="mt-2">
                Clonable will persist the new project, seed the default agents, ask the
                planner for an MVP draft, and fall back to a manual draft if the planner is
                unavailable.
              </CardDescription>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create project
              </button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

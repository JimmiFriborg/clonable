import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";

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
          <CreateProjectForm />
        </Card>
      </div>
    </main>
  );
}

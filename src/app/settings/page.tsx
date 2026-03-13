import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/features/projects/components/page-intro";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageIntro
          eyebrow="Settings"
          title="Global controls should stay practical"
          description="Clonable keeps provider, workspace, and safety controls centralized so projects inherit stable defaults without becoming opaque."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Provider routing",
              description:
                "Planner defaults to GPT-5.4, code editing defaults to GPT-5.3-Codex, and validation falls back to Gemini 3.1.",
            },
            {
              title: "Workspace defaults",
              description:
                "Project workspaces, local preview ports, and Git conventions will be configured here as the repository layer lands.",
            },
            {
              title: "Safety controls",
              description:
                "Serialized write access, escalation rules, and approval requirements will stay visible and adjustable.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="mt-3">{item.description}</CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

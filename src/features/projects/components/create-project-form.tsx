"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function CreateProjectForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim(),
        ideaPrompt: String(formData.get("ideaPrompt") ?? "").trim(),
        targetUser: String(formData.get("targetUser") ?? "").trim(),
        constraints: parseLines(formData.get("constraints")),
        stackPreferences: parseLines(formData.get("stackPreferences")),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to create project.");
      setPending(false);
      return;
    }

    const project = (await response.json()) as { id: string };
    router.push(`/projects/${project.id}/build`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
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
          <span className="text-sm font-semibold text-slate-900">Constraints</span>
          <textarea
            name="constraints"
            rows={6}
            placeholder={"One line per constraint\nMust be local-first\nUse boring stable tech"}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-900">Stack preferences</span>
          <textarea
            name="stackPreferences"
            rows={6}
            placeholder={"One line per preference\nNext.js\nTypeScript\nTailwind"}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
          />
        </label>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
        <p className="text-base font-semibold text-slate-950">What happens next</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Clonable will persist the new project, seed the default agents, ask the
          planner for an MVP draft, and fall back to a manual draft if the planner is
          unavailable.
        </p>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full touch-manipulation justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {pending ? "Creating project..." : "Create project"}
        </button>
      </div>
    </form>
  );
}

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
        githubRepositoryUrl: String(formData.get("githubRepositoryUrl") ?? "").trim() || undefined,
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
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">What do you want to build?</span>
        <textarea
          name="ideaPrompt"
          required
          rows={9}
          placeholder="Describe the product idea, the problem, and what a believable first MVP should accomplish."
          className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.86))] p-4">
        <p className="text-base font-semibold text-slate-950">Clonable will auto-fill the rest</p>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
          <p>Project name if you leave it blank.</p>
          <p>Target user if you do not specify one yet.</p>
          <p>Stable starter stack preferences if none are provided.</p>
          <p>GitHub remote automatically if your install has a default owner configured.</p>
        </div>
      </div>

      <details className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Advanced project setup (optional)
        </summary>

        <div className="mt-5 grid gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Project name</span>
              <input
                name="name"
                placeholder="Auto-generated if left blank"
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Target user</span>
              <input
                name="targetUser"
                placeholder="Auto-derived if left blank"
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-600"
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Constraints</span>
              <textarea
                name="constraints"
                rows={5}
                placeholder={"One line per constraint\nMust be local-first\nUse boring stable tech"}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Stack preferences</span>
              <textarea
                name="stackPreferences"
                rows={5}
                placeholder={"One line per preference\nNext.js\nTypeScript\nTailwind"}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">GitHub repository</span>
            <input
              name="githubRepositoryUrl"
              placeholder="https://github.com/your-org/your-repo.git"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-teal-600"
            />
            <span className="text-sm leading-6 text-slate-500">
              Optional. Leave it blank if you want Clonable to derive the remote from your default
              GitHub owner later.
            </span>
          </label>
        </div>
      </details>

      <div className="rounded-[24px] border border-slate-200 bg-slate-950/[0.03] p-4">
        <p className="text-base font-semibold text-slate-950">What happens next</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Clonable will create the project, seed provider-first default agents, draft the MVP with
          your configured provider when available, and fall back to a manual MVP draft if AI is not
          configured or unavailable.
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
          {pending ? "Drafting MVP..." : "Draft my MVP"}
        </button>
      </div>
    </form>
  );
}

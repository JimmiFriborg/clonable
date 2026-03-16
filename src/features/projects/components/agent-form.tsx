"use client";

import { useState } from "react";

import { aiProviderOrder, agentRuntimeBackendOrder } from "@/server/domain/ai-provider";
import type { AgentRecord } from "@/server/domain/project";
import { agentPolicyRoleOrder, agentStatusOrder } from "@/server/domain/project";
import type { OpenClawBotProfile } from "@/server/domain/openclaw";

function formatLines(values: string[]) {
  return values.join("\n");
}

function formatFallbackProviders(
  values: Array<{
    provider: string;
    model: string;
  }>,
) {
  return values.map((value) => `${value.provider}:${value.model}`).join("\n");
}

interface AgentFormProps {
  action: (formData: FormData) => void | Promise<void>;
  bots: OpenClawBotProfile[];
  submitLabel: string;
  initial?: AgentRecord;
}

export function AgentForm({ action, bots, submitLabel, initial }: AgentFormProps) {
  const [runtimeBackend, setRuntimeBackend] = useState<(typeof agentRuntimeBackendOrder)[number]>(
    initial?.runtimeBackend ?? "provider",
  );
  const initialProviderModel = initial?.runtimeBackend === "provider" ? initial.model : "";

  return (
    <form action={action} className="mt-6 grid gap-5 lg:grid-cols-2">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Name</span>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="Migration Agent"
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Role</span>
        <input
          name="role"
          required
          defaultValue={initial?.role}
          placeholder="Handle schema and migration work."
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Policy role</span>
        <select
          name="policyRole"
          defaultValue={initial?.policyRole ?? "builder"}
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        >
          {agentPolicyRoleOrder.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Status</span>
        <select
          name="status"
          defaultValue={initial?.status ?? "ready"}
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        >
          {agentStatusOrder.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Runtime backend</span>
        <select
          name="runtimeBackend"
          value={runtimeBackend}
          onChange={(event) =>
            setRuntimeBackend(event.target.value as (typeof agentRuntimeBackendOrder)[number])
          }
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        >
          {agentRuntimeBackendOrder.map((backend) => (
            <option key={backend} value={backend}>
              {backend}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">WIP limit</span>
        <input
          name="wipLimit"
          defaultValue={initial?.wipLimit ?? ""}
          placeholder="1"
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      {runtimeBackend === "openclaw" ? (
        <>
          <input type="hidden" name="provider" value={initial?.provider ?? "openai"} />
          <input type="hidden" name="model" value="OpenClaw" />
          <input type="hidden" name="fallbackProviders" value="" />
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">OpenClaw bot</span>
            <select
              name="openclawBotId"
              defaultValue={initial?.openclawBotId ?? bots[0]?.id}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
            <span className="text-sm leading-6 text-slate-500">
              OpenClaw-backed agents use the selected bot persona and stay separate from direct provider calls.
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Provider</span>
            <select
              name="provider"
              defaultValue={initial?.provider ?? "openai"}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            >
              {aiProviderOrder.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Model</span>
            <input
              name="model"
              required
              defaultValue={initialProviderModel}
              placeholder="gpt-5.4"
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Fallback providers</span>
            <textarea
              name="fallbackProviders"
              rows={3}
              defaultValue={formatFallbackProviders(initial?.fallbackProviders ?? [])}
              placeholder={"One per line\nanthropic:claude-sonnet-4.5\ngemini:gemini-3.1-pro"}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>
        </>
      )}

      <label className="grid gap-2 lg:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Instruction summary</span>
        <input
          name="instructionsSummary"
          required
          defaultValue={initial?.instructionsSummary}
          placeholder="Own schema migrations and task-safe persistence updates."
          className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2 lg:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Instructions</span>
        <textarea
          name="instructions"
          required
          rows={4}
          defaultValue={initial?.instructions}
          className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Permissions</span>
        <textarea
          name="permissions"
          rows={4}
          defaultValue={formatLines(initial?.permissions ?? [])}
          placeholder={"One per line\nedit schema\nrun repository tests"}
          className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-900">Boundaries</span>
        <textarea
          name="boundaries"
          rows={4}
          defaultValue={formatLines(initial?.boundaries ?? [])}
          placeholder={"One per line\nno scope expansion\nno direct user contact"}
          className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="grid gap-2 lg:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Escalation rules</span>
        <textarea
          name="escalationRules"
          rows={3}
          defaultValue={formatLines(initial?.escalationRules ?? [])}
          placeholder={"One per line\nescalate data-loss risk\nescalate unresolved dependency chain"}
          className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="flex items-center gap-3">
        <input type="hidden" name="enabled" value="false" />
        <input
          type="checkbox"
          name="enabled"
          value="true"
          defaultChecked={initial?.enabled ?? true}
          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
        />
        <span className="text-sm text-slate-700">Enabled</span>
      </label>

      <label className="flex items-center gap-3">
        <input type="hidden" name="canWriteWorkspace" value="false" />
        <input
          type="checkbox"
          name="canWriteWorkspace"
          value="true"
          defaultChecked={initial?.canWriteWorkspace ?? false}
          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
        />
        <span className="text-sm text-slate-700">Can write workspace</span>
      </label>

      <div className="flex justify-end lg:col-span-2">
        <button
          type="submit"
          className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

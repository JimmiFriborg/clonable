"use client";

import { useEffect, useState } from "react";

interface AppwriteAuthPanelProps {
  configured: boolean;
  endpoint?: string;
  projectId?: string;
  siteUrl?: string;
}

interface AppwriteAccount {
  $id: string;
  name: string;
  email: string;
}

async function requestAppwrite<T>(
  endpoint: string,
  projectId: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${endpoint.replace(/\/$/, "")}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Appwrite request failed.";

    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Ignore JSON parsing errors and keep the generic message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function AppwriteAuthPanel({
  configured,
  endpoint,
  projectId,
  siteUrl,
}: AppwriteAuthPanelProps) {
  const [account, setAccount] = useState<AppwriteAccount | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!configured || !endpoint || !projectId) {
      return;
    }

    let cancelled = false;

    void requestAppwrite<AppwriteAccount>(endpoint, projectId, "/account")
      .then((currentAccount) => {
        if (!cancelled) {
          setAccount(currentAccount);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccount(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured, endpoint, projectId]);

  async function handleSignIn() {
    if (!configured || !endpoint || !projectId) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsPending(true);

    requestAppwrite<AppwriteAccount>(endpoint, projectId, "/account/sessions/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
      .then(() => requestAppwrite<AppwriteAccount>(endpoint, projectId, "/account"))
      .then((currentAccount) => {
        setAccount(currentAccount);
        setPassword("");
        setMessage("Signed in to Appwrite for this browser session.");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Sign-in failed.");
      })
      .finally(() => {
        setIsPending(false);
      });
  }

  async function handleSignOut() {
    if (!configured || !endpoint || !projectId) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsPending(true);

    requestAppwrite(endpoint, projectId, "/account/sessions/current", {
      method: "DELETE",
    })
      .then(() => {
        setAccount(null);
        setMessage("Signed out of the current Appwrite session.");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Sign-out failed.");
      })
      .finally(() => {
        setIsPending(false);
      });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-700">
        {configured
          ? "Use the Clonable Appwrite project for browser auth while Clonable keeps policy and execution on its own server."
          : "Appwrite public config is missing, so hosted sign-in is not available yet."}
      </p>

      {siteUrl ? (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Hosted target: {siteUrl}
        </div>
      ) : null}

      {configured && account ? (
        <div className="space-y-3">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">{account.name || account.email}</p>
            <p className="mt-1 text-emerald-900/80">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign out
          </button>
        </div>
      ) : configured ? (
        <div className="space-y-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-900">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600"
            />
          </label>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isPending || !email.trim() || !password}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign in with Appwrite
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

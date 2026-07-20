"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { checkHandleAvailability } from "@/lib/identity";
import { signOut } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";
import { ModePill } from "@/components/ModePill";

/**
 * Account.
 *
 * Onboarding was the only place a handle could ever be set — after that there
 * was no way to change it, see your address, or sign out. Signing out required
 * clearing localStorage by hand.
 */
export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    handle: string | null;
    address: string | null;
    email: string | null;
  } | null>(null);
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.auth.me
      .query()
      .then((me) => {
        if (cancelled) return;
        setProfile({ handle: me.handle, address: me.address, email: me.email });
        setHandle(me.handle ?? "");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Availability check, debounced, skipping the handle they already own.
  useEffect(() => {
    const trimmed = handle.trim();
    if (!trimmed || trimmed === profile?.handle) {
      // Deferred so the state update isn't synchronous inside the effect,
      // which would cascade renders.
      const reset = setTimeout(() => setStatus("idle"), 0);
      return () => clearTimeout(reset);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setStatus("checking");
      checkHandleAvailability(trimmed)
        .then((free) => {
          if (!cancelled) setStatus(free ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setStatus("idle");
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, profile?.handle]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.auth.setHandle.mutate({ handle: handle.trim() });
      setProfile((prev) => (prev ? { ...prev, handle: updated.handle } : prev));
      setSaved(true);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function copyAddress() {
    if (!profile?.address) return;
    try {
      await navigator.clipboard.writeText(profile.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the address instead.");
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <ModePill />

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">Handle</p>

        <label htmlFor="handle" className="sr-only">
          Handle
        </label>
        <input
          id="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="yourhandle"
          className="mt-3 w-full rounded-xl border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />

        <div className="mt-2 h-5">
          {status === "checking" && (
            <p className="font-body text-[13px] text-muted">Checking</p>
          )}
          {status === "available" && (
            <p className="font-body text-[13px] text-text">{handle} is available.</p>
          )}
          {status === "taken" && (
            <p className="font-body text-[13px] text-coral">{handle} is taken.</p>
          )}
          {saved && status === "idle" && (
            <p className="font-body text-[13px] text-text">Saved.</p>
          )}
        </div>

        <ErrorNote message={error} className="mt-3" />

        <button
          type="button"
          onClick={save}
          disabled={saving || status !== "available"}
          className="mt-4 w-full rounded-full border-2 border-void bg-signal px-6 py-3.5 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {saving ? "Saving" : "Save handle"}
        </button>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Your address
        </p>
        <p className="mt-3 break-all font-mono text-[12px] leading-[1.6] text-text">
          {profile?.address ?? "…"}
        </p>
        <p className="mt-2 font-body text-[12px] text-muted">
          This is where people send you money. It works on every chain FLOAT supports.
        </p>
        <button
          type="button"
          onClick={copyAddress}
          className="mt-3 rounded-full border-2 border-void bg-void-3 px-4 py-2 font-body text-[13px] font-medium text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {copied ? "Copied" : "Copy address"}
        </button>

        {profile?.email && (
          <p className="mt-5 font-body text-[13px] text-muted">
            Signed in as {profile.email}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full rounded-full border-2 border-void bg-coral px-6 py-3.5 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      >
        Sign out
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkHandleAvailability } from "@/lib/identity";

type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState<{ handle: string; available: boolean } | null>(
    null
  );

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;

    const timeout = setTimeout(() => {
      checkHandleAvailability(handle).then((available) => {
        if (cancelled) return;
        setResult({ handle, available });
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [handle]);

  const status: AvailabilityStatus = !handle
    ? "idle"
    : result?.handle === handle
      ? result.available
        ? "available"
        : "taken"
      : "checking";

  function handlePhotoTap() {
    // TODO: wire real photo upload / picker once storage is decided.
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm rounded-2xl border border-float-border bg-float-surface p-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[28px] font-bold text-float-heading">
            Choose your handle
          </h1>
          <p className="mt-3 font-body text-[15px] text-float-body">
            This is how people will find you on FLOAT.
          </p>

          <button
            type="button"
            onClick={handlePhotoTap}
            aria-label="Add profile photo"
            className="mt-8 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-float-border text-float-muted transition-colors hover:bg-float-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
          >
            <span className="font-body text-[13px]">Add photo</span>
          </button>

          <label htmlFor="handle" className="sr-only">
            Handle
          </label>
          <input
            id="handle"
            name="handle"
            type="text"
            autoComplete="off"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="yourhandle"
            className="mt-8 w-full rounded-md border border-float-border bg-float-surface-2 px-4 py-3 text-center font-body text-[15px] text-float-body placeholder:text-float-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
          />

          <div className="mt-2 h-5">
            {status === "checking" && (
              <p className="font-body text-[13px] text-float-muted">Checking</p>
            )}
            {status === "available" && (
              <p className="font-body text-[13px] text-float-positive">
                {handle} is available.
              </p>
            )}
            {status === "taken" && (
              <p className="font-body text-[13px] text-float-danger">
                {handle} is taken. Try another.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={status !== "available"}
            onClick={() => router.push("/onboarding/discovery")}
            className="mt-6 w-full rounded-full bg-float-signal px-6 py-4 font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkHandleAvailability } from "@/lib/identity";

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "failed";

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState<{ handle: string; available: boolean } | null>(
    null
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [failedHandle, setFailedHandle] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;

    const timeout = setTimeout(() => {
      checkHandleAvailability(handle)
        .then((available) => {
          if (cancelled) return;
          setResult({ handle, available });
        })
        .catch(() => {
          if (cancelled) return;
          // Without this the field sits on "Checking" forever and Continue
          // never enables.
          setFailedHandle(handle);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [handle]);

  const status: AvailabilityStatus = !handle
    ? "idle"
    : failedHandle === handle
      ? "failed"
      : result?.handle === handle
        ? result.available
          ? "available"
          : "taken"
        : "checking";

  function handlePhotoTap() {
    fileInputRef.current?.click();
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // TODO: replace local preview with a real upload once storage is decided.
    setPhotoUrl(URL.createObjectURL(file));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] rounded-[22px] border-2 border-void bg-surface p-9 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[26px] font-bold text-text">
            Choose your handle
          </h1>
          <p className="mt-3 font-body text-[14px] leading-[1.5] text-muted">
            This is how people will find you on FLOAT.
          </p>

          <button
            type="button"
            onClick={handlePhotoTap}
            aria-label={photoUrl ? "Change profile photo" : "Add profile photo"}
            className="mt-7 flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed text-muted-2 transition-colors hover:bg-void-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable static/remote image
              <img
                src={photoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-mono text-[11px]">Add photo</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
          />

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
            className="mt-7 w-full rounded-xl border-2 border-void bg-void-3 px-[18px] py-3.5 text-center font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          />

          <div className="mt-2 h-5">
            {status === "checking" && (
              <p className="font-body text-[13px] text-muted">Checking</p>
            )}
            {status === "available" && (
              <p className="flex items-center justify-center gap-1.5 font-body text-[13px] text-text">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
                {handle} is available.
              </p>
            )}
            {status === "taken" && (
              <p className="font-body text-[13px] text-coral">
                {handle} is taken. Try another.
              </p>
            )}
            {status === "failed" && (
              <p role="alert" className="font-body text-[13px] text-coral">
                Couldn&apos;t check that handle. Try again.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={status !== "available"}
            onClick={() => router.push("/onboarding/discovery")}
            className="mt-5 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

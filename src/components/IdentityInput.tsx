"use client";

import { useEffect, useState } from "react";
import { resolveIdentity } from "@/lib/identity";
import type { IdentityResolution } from "@/lib/identity";

type IdentityInputProps = {
  onResolvedChange: (resolution: IdentityResolution | null) => void;
};

type Status = "idle" | "resolving" | "resolved" | "new";

function isEmail(value: string): boolean {
  return value.includes("@");
}

function isEns(value: string): boolean {
  return value.toLowerCase().endsWith(".eth");
}

export function IdentityInput({ onResolvedChange }: IdentityInputProps) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resolution, setResolution] = useState<IdentityResolution | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(timeout);
  }, [value]);

  const shouldResolve = debounced !== "" && (isEmail(debounced) || isEns(debounced));
  const isCurrent = shouldResolve && resolution?.input === debounced;

  useEffect(() => {
    if (!shouldResolve) {
      onResolvedChange(null);
      return;
    }

    let cancelled = false;

    resolveIdentity(debounced).then((result) => {
      if (cancelled) return;
      setResolution(result);
      onResolvedChange(result);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, shouldResolve]);

  const status: Status = !shouldResolve
    ? "idle"
    : !isCurrent
      ? "resolving"
      : resolution!.type === "email"
        ? "new"
        : "resolved";

  return (
    <div className="w-full">
      <label htmlFor="recipient" className="font-body text-xs text-float-muted">
        To
      </label>
      <input
        id="recipient"
        name="recipient"
        type="text"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="name.eth, @handle, or email"
        className="mt-2 w-full rounded-md border border-float-border bg-float-surface-2 px-4 py-3 font-body text-[15px] text-float-body placeholder:text-float-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
      />

      <div className="mt-4 min-h-10">
        {status === "resolving" && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border border-float-signal border-t-transparent motion-reduce:animate-none"
            />
            <p className="font-body text-[13px] text-float-muted">Resolving</p>
          </div>
        )}

        {status === "resolved" && resolution && (
          <p className="font-body text-[13px] text-float-muted">
            Found. {resolution.input} on {resolution.chains.join(" + ")}.
          </p>
        )}

        {status === "new" && resolution && (
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-float-warning"
              />
              <p className="font-body text-[13px] text-float-muted">
                {resolution.input} will receive a claim link
              </p>
            </div>
            <p className="mt-1 font-body text-[11px] uppercase tracking-wide text-float-muted">
              New to FLOAT
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

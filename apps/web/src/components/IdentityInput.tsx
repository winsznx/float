"use client";

import { useEffect, useState } from "react";
import { resolveIdentity } from "@/lib/identity";
import type { IdentityResolution } from "@/lib/identity";

type IdentityInputProps = {
  onResolvedChange: (resolution: IdentityResolution | null) => void;
};

type Status = "idle" | "resolving" | "resolved" | "new" | "notFound" | "failed";

/**
 * Where the address came from. Shown because "Found. @name" told the user
 * nothing about *which* @name: a send to "@winsznx" resolved through Farcaster
 * and paid that person's Farcaster wallet, while the FLOAT account the sender
 * meant sat untouched. The source and the destination address have to be on
 * screen before money moves.
 */
const SOURCE_LABEL: Record<IdentityResolution["type"], string> = {
  float: "FLOAT account",
  ens: "ENS",
  farcaster: "Farcaster",
  email: "Email",
  address: "Address",
};

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function IdentityInput({ onResolvedChange }: IdentityInputProps) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resolution, setResolution] = useState<IdentityResolution | null>(null);
  const [failedInput, setFailedInput] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(timeout);
  }, [value]);

  // Previously gated to emails and .eth names, so FLOAT handles, Farcaster
  // handles and raw addresses never reached resolution at all — the recipient
  // step simply never unlocked for them.
  const shouldResolve = debounced.length >= 3;
  const isCurrent = shouldResolve && resolution?.input === debounced;

  useEffect(() => {
    if (!shouldResolve) {
      onResolvedChange(null);
      return;
    }

    let cancelled = false;

    resolveIdentity(debounced)
      .then((result) => {
        if (cancelled) return;
        setResolution(result);
        // An unresolvable non-email has nowhere to send and no way to be
        // claimed. Passing it on would write a send row that can never settle.
        const sendable = !!result.resolvedAddress || result.type === "email";
        onResolvedChange(sendable ? result : null);
      })
      .catch(() => {
        if (cancelled) return;
        // Without this the field spins on "Resolving" forever and the step's
        // Next button never unlocks.
        setFailedInput(debounced);
        onResolvedChange(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, shouldResolve]);

  const status: Status = !shouldResolve
    ? "idle"
    : failedInput === debounced
      ? "failed"
      : !isCurrent
        ? "resolving"
        : resolution!.resolvedAddress
          ? "resolved"
          : resolution!.type === "email"
            ? "new"
            : "notFound";

  return (
    <div className="w-full">
      <label
        htmlFor="recipient"
        className="font-mono text-xs uppercase tracking-wide text-muted"
      >
        To
      </label>
      <input
        id="recipient"
        name="recipient"
        type="text"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="@handle, name.eth, email, or address"
        className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
      />

      <div className="mt-4 min-h-10">
        {status === "resolving" && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border border-signal border-t-transparent motion-reduce:animate-none"
            />
            <p className="font-body text-[13px] text-muted">Resolving</p>
          </div>
        )}

        {status === "resolved" && resolution && (
          <div>
            <p className="font-body text-[13px] text-text">
              {SOURCE_LABEL[resolution.type]} · {resolution.input}
            </p>
            {resolution.resolvedAddress && (
              <p className="mt-1 font-mono text-[11px] text-muted-2">
                {shortAddress(resolution.resolvedAddress)}
                {resolution.chains.length > 0 && ` · ${resolution.chains.join(" + ")}`}
              </p>
            )}
            {resolution.type === "farcaster" && resolution.isNewUser && (
              <p className="mt-2 font-body text-[12px] text-coral">
                Not a FLOAT account. This pays their Farcaster wallet.
              </p>
            )}
          </div>
        )}

        {status === "notFound" && (
          <p role="alert" className="font-body text-[13px] text-coral">
            No FLOAT account, ENS name, or Farcaster handle matches that. Try an
            email and they&apos;ll get a claim link.
          </p>
        )}

        {status === "new" && resolution && (
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-signal"
              />
              <p className="font-body text-[13px] text-muted">
                {resolution.input} will receive a claim link
              </p>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-2">
              New to FLOAT
            </p>
          </div>
        )}

        {status === "failed" && (
          <p role="alert" className="font-body text-[13px] text-coral">
            Couldn&apos;t look that up. Check the name, or try again.
          </p>
        )}
      </div>
    </div>
  );
}

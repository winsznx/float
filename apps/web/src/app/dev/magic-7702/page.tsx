"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import {
  loginWithEmailOtp,
  getWalletAddress,
  sign7702Authorization,
  isLoggedIn,
  logout,
} from "@/lib/chain/magic";
import {
  createUniversalAccount,
  toParticleAuthorization,
} from "@/lib/chain/universal-account";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";

/**
 * PHASE 3 PROOF 2 — a Magic-provisioned wallet completing an EIP-7702
 * authorization for a Particle Universal Account.
 *
 * This cannot run headlessly: Magic's signing happens inside its iframe/TEE,
 * so it needs a browser and a human to complete the email OTP. That is why
 * this is a page rather than a script.
 *
 * Dev-only — 404s in production builds.
 */

const ARBITRUM_ONE = 42161;

type Step = {
  label: string;
  value?: string;
  ok?: boolean;
};

export default function MagicSevenSevenZeroTwoProof() {
  if (process.env.NODE_ENV === "production") notFound();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  const push = (step: Step) => setSteps((prev) => [...prev, step]);

  async function run() {
    setBusy(true);
    setError(null);
    setSteps([]);

    try {
      if (await isLoggedIn()) {
        await logout();
        push({ label: "cleared previous Magic session", ok: true });
      }

      // 1. Email OTP — Magic provisions (or recovers) the embedded wallet.
      push({ label: "opening Magic OTP…" });
      await loginWithEmailOtp(email);
      push({ label: "Magic login complete", ok: true });

      const address = await getWalletAddress();
      if (!address) throw new Error("Magic returned no wallet address");
      push({ label: "Magic wallet address", value: address, ok: true });

      // 2. Point a Universal Account at that Magic wallet as owner.
      const ua = createUniversalAccount(address);
      const options = await ua.getSmartAccountOptions();
      const unchanged =
        (options.smartAccountAddress ?? "").toLowerCase() === address.toLowerCase();
      push({
        label: "UA address == Magic wallet (in-place upgrade)",
        value: options.smartAccountAddress,
        ok: unchanged,
      });

      // 3. Ask Particle which delegation to authorize.
      const authTuples = await ua.getEIP7702Auth([ARBITRUM_ONE]);
      const tuple = authTuples[0];
      push({
        label: "delegation to authorize",
        value: `${tuple.address} (chainId ${tuple.chainId}, nonce ${tuple.nonce})`,
        ok: true,
      });

      // 4. THE PROOF: Magic signs the EIP-7702 authorization tuple.
      //    chainId 0 authorizes on every chain at once.
      const signed = await sign7702Authorization({
        contractAddress: tuple.address,
        chainId: tuple.chainId,
        nonce: tuple.nonce,
      });
      push({
        label: "Magic signed the 7702 authorization",
        value: `v=${signed.v} r=${String(signed.r).slice(0, 18)}…`,
        ok: true,
      });

      // 5. Normalize into the shape Particle forwards on-chain.
      const particleAuth = toParticleAuthorization("0x", signed);
      push({
        label: "normalized to Particle authorization",
        value: `${particleAuth.signature.slice(0, 24)}… (${
          (particleAuth.signature.length - 2) / 2
        } bytes)`,
        ok: (particleAuth.signature.length - 2) / 2 === 65,
      });

      const assets = await ua.getPrimaryAssets();
      push({
        label: "unified balance visible to this UA",
        value: `$${assets.totalAmountInUSD.toFixed(2)}`,
        ok: true,
      });

      push({ label: "PROOF 2 COMPLETE", ok: true });
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Phase 3 · Proof 2
        </p>
        <h1 className="mt-2 font-display text-[26px] font-bold text-text">
          Magic wallet signs an EIP-7702 authorization
        </h1>
        <p className="mt-3 font-body text-[14px] leading-[1.5] text-muted">
          Magic signs inside its own iframe, so this needs a real browser and a
          real email code. Enter an address you can receive mail at.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-6 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />

        <ErrorNote message={error} className="mt-4" />

        <button
          type="button"
          onClick={run}
          disabled={busy || !email}
          className="mt-4 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {busy ? "Running…" : "Run proof"}
        </button>
      </div>

      {steps.length > 0 && (
        <ol className="flex flex-col gap-2 rounded-2xl border-2 border-void bg-surface p-6 shadow-[7px_7px_0_0_var(--color-brut-line)]">
          {steps.map((step, i) => (
            <li key={i} className="font-mono text-[12px] leading-[1.6] text-text">
              <span className={step.ok === false ? "text-coral" : "text-muted"}>
                {step.ok === undefined ? "·" : step.ok ? "✓" : "✗"}
              </span>{" "}
              {step.label}
              {step.value && (
                <span className="block break-all pl-4 text-muted-2">{step.value}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

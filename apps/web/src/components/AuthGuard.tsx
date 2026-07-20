"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/session";

/**
 * Gate for the authenticated app.
 *
 * Without this every mode route was reachable with no session at all — you
 * could land on /home, see an empty balance and an empty feed, and have no
 * idea you were never signed in. Which is exactly what happened: the landing
 * page's "Connect wallet" linked straight to onboarding and skipped auth
 * entirely.
 *
 * The session is read through useSyncExternalStore rather than an effect, so
 * there's no cascading render and the guard reacts if the session is cleared
 * in another tab.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("float:session", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("float:session", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const hasSession = useSyncExternalStore(
    subscribe,
    () => !!readSession(),
    // Server render has no localStorage; treat it as unresolved so nothing
    // flashes before the client decides.
    () => false
  );

  useEffect(() => {
    if (!hasSession) router.replace("/onboarding/email");
  }, [hasSession, router]);

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-muted">Loading</p>
      </div>
    );
  }

  return <>{children}</>;
}

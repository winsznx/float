"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/session";

/**
 * Gate for the authenticated app.
 *
 * Without this every mode route was reachable with no session at all — you
 * could land on /home, see an empty balance and an empty feed, and have no
 * idea you were never signed in.
 *
 * Three states, not two. localStorage doesn't exist during SSR or the first
 * hydration pass, so a boolean "has session" starts false for everyone and the
 * redirect fires before the real value is ever read — bouncing signed-in users
 * to onboarding on every refresh. "unknown" holds the app until the client has
 * actually looked.
 */
type State = "unknown" | "authed" | "anonymous";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("unknown");

  useEffect(() => {
    const read = () => setState(readSession() ? "authed" : "anonymous");
    read();

    // Reacts to sign-out in this tab and in others.
    window.addEventListener("float:session", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("float:session", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    if (state === "anonymous") router.replace("/onboarding/email");
  }, [state, router]);

  if (state !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-muted">Loading</p>
      </div>
    );
  }

  return <>{children}</>;
}

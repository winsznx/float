"use client";

import { useEffect, useState } from "react";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { HomePromoCard } from "@/components/HomePromoCard";
import { HomeQuickActions } from "@/components/HomeQuickActions";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getBalance, type UnifiedBalance } from "@/lib/balance";

/**
 * Home screen.
 *
 * Balance is fetched once here and passed down, rather than each card querying
 * independently — the Universal Account lookup is a network round trip, and
 * the promo card needs to know whether the account is empty so it can offer a
 * deposit address instead of an upsell.
 */
export function HomeShell() {
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((result) => {
        if (!cancelled) setBalance(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
        <BalanceDisplay balance={balance} failed={failed} />
        <HomePromoCard balance={balance?.total} />
      </div>

      <HomeQuickActions />

      <ActivityFeed />
    </div>
  );
}

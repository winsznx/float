import { BalanceDisplay } from "@/components/BalanceDisplay";
import { HomePromoCard } from "@/components/HomePromoCard";
import { HomeQuickActions } from "@/components/HomeQuickActions";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
        <BalanceDisplay />
        <HomePromoCard />
      </div>

      <HomeQuickActions />

      <div className="flex items-center justify-center rounded-lg border-2 border-void bg-surface py-12 shadow-[5px_5px_0_0_var(--color-brut-line)]">
        <p className="font-body text-sm text-muted">
          No recent activity yet
        </p>
      </div>
    </div>
  );
}

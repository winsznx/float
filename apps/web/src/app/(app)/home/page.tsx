import { BalanceDisplay } from "@/components/BalanceDisplay";
import { HomePromoCard } from "@/components/HomePromoCard";
import { HomeQuickActions } from "@/components/HomeQuickActions";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
        <BalanceDisplay />
        <HomePromoCard />
      </div>

      <HomeQuickActions />

      <ActivityFeed />
    </div>
  );
}

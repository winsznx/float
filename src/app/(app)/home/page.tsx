import { BalanceDisplay } from "@/components/BalanceDisplay";
import { ModePill } from "@/components/ModePill";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <BalanceDisplay />
      <ModePill />
      <div className="flex items-center justify-center rounded-lg border-2 border-void bg-surface py-12 shadow-[5px_5px_0_0_var(--color-brut-line)]">
        <p className="font-body text-sm text-muted">
          No recent activity yet
        </p>
      </div>
    </div>
  );
}

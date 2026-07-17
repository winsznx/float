import { BalanceDisplay } from "@/components/BalanceDisplay";
import { ModePill } from "@/components/ModePill";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <BalanceDisplay />
      <ModePill />
      <div className="flex items-center justify-center rounded-lg border border-float-border bg-float-surface py-12">
        <p className="font-body text-sm text-float-muted">
          No recent activity yet
        </p>
      </div>
    </div>
  );
}

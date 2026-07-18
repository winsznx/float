import { BalanceDiscovery } from "@/components/BalanceDiscovery";

export default function OnboardingDiscoveryPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] rounded-[22px] border-2 border-void bg-surface p-9 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <BalanceDiscovery />
      </div>
    </main>
  );
}

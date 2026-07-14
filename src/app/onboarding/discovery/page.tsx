import { BalanceDiscovery } from "@/components/BalanceDiscovery";

export default function OnboardingDiscoveryPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <BalanceDiscovery />
      </div>
    </main>
  );
}

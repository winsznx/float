import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { GrainOverlay } from "@/components/GrainOverlay";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-page">
      <GrainOverlay />
      <TopBar />
      <main className="flex-1 px-5 pb-24 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}

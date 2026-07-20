import { TopBar } from "@/components/TopBar";
import { GrainOverlay } from "@/components/GrainOverlay";
import { AuthGuard } from "@/components/AuthGuard";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-full flex-1 flex-col bg-page">
        <GrainOverlay />
        <TopBar />
        <main className="flex-1 px-5 pb-10 pt-6">{children}</main>
      </div>
    </AuthGuard>
  );
}

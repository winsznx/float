import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ModeCards } from "@/components/landing/ModeCards";
import { ProblemResolution } from "@/components/landing/ProblemResolution";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Thesis } from "@/components/landing/Thesis";
import { Faq } from "@/components/landing/Faq";
import { Signoff } from "@/components/landing/Signoff";

export default function Home() {
  return (
    <main className="flex-1">
      <LandingNav />
      <Hero />
      <ModeCards />
      <ProblemResolution />
      <TrustStrip />
      <Thesis />
      <Faq />
      <Signoff />
    </main>
  );
}

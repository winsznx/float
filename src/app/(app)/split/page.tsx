import { ModePill } from "@/components/ModePill";

export default function SplitPage() {
  return (
    <div className="flex flex-col gap-6">
      <ModePill />
      <h1 className="font-display text-2xl text-float-heading">Split</h1>
    </div>
  );
}

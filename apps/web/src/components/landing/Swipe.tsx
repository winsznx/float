export function Swipe({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded-[6px] border-2 border-void bg-signal px-3 py-0.5 text-void"
      style={{
        boxShadow: "3px 3px 0 0 var(--color-void)",
        transform: "rotate(-1deg)",
      }}
    >
      {children}
    </span>
  );
}

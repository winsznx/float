type IconProps = {
  className?: string;
};

function SendIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-void)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 11L21 3L13 21L11 13L3 11Z" />
    </svg>
  );
}

function SplitIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-void)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4V10" />
      <path d="M12 10L6 18" />
      <path d="M12 10L18 18" />
    </svg>
  );
}

function LeashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-void)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="5" />
      <circle cx="16" cy="12" r="5" />
    </svg>
  );
}

function PledgeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-void)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const MODES = [
  {
    name: "Send",
    subline: "Type a name. Not an address.",
    href: "/send",
    bgClass: "bg-coral",
    rotateClass: "rotate-[-1.4deg]",
    Icon: SendIcon,
  },
  {
    name: "Split",
    subline: "Everyone settles from what they have.",
    href: "/split",
    bgClass: "bg-mint",
    rotateClass: "rotate-[1.6deg]",
    Icon: SplitIcon,
  },
  {
    name: "Leash",
    subline: "Their key. Your rules. Your balance.",
    href: "/leash",
    bgClass: "bg-lav",
    rotateClass: "rotate-[-1.3deg]",
    Icon: LeashIcon,
  },
  {
    name: "Pledge",
    subline: "Skin in the game. Onchain.",
    href: "/pledge",
    bgClass: "bg-signal-faint",
    rotateClass: "rotate-[1.5deg]",
    Icon: PledgeIcon,
  },
] as const;

export function ModeCards() {
  return (
    <section id="modes" className="px-6 py-24">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-center font-display text-[32px] font-bold tracking-tight text-text sm:text-[40px]">
          Four ways to move money
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {MODES.map(({ name, subline, bgClass, rotateClass, Icon }) => (
            <div
              key={name}
              className={`relative rounded-2xl border-2 border-void ${bgClass} ${rotateClass} p-7 shadow-[6px_6px_0_0_var(--color-brut-line)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0`}
            >
              <Icon className="absolute right-6 top-6 h-6 w-6" />
              <span className="font-display text-[22px] font-bold text-void">
                {name}
              </span>
              <p className="mt-2 max-w-[85%] font-body text-[14px] text-void/70">
                {subline}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

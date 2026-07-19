type ErrorNoteProps = {
  message: string | null;
  className?: string;
};

export function ErrorNote({ message, className = "" }: ErrorNoteProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={`rounded-md border-2 border-void bg-coral/25 px-4 py-3 font-body text-[13px] leading-[1.5] text-text ${className}`}
    >
      {message}
    </p>
  );
}

export function VeilMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-8 w-8 text-accent"}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 6 L12 18 M6 12 L18 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

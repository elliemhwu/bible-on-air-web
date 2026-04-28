export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M5 7 L1 3 L9 3 Z" />
    </svg>
  );
}

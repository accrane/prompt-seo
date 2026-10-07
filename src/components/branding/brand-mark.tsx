// WP Manager mark: a rounded tile with a "W". Renders from currentColor (the
// dock passes text-[var(--brand-mark)]), sized via className.
export function BrandMark({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect height="20" rx="4" width="20" x="2" y="2" />
      <path
        d="M6.5 8.5 9 16l3-6 3 6 2.5-7.5"
        fill="none"
        stroke="var(--background, #fff)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

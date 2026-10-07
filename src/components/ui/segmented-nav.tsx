"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SegmentedNavProps = {
  ariaLabel: string;
  items: { href: string; label: string; count?: number }[];
};

// Segmented sub-navigation (settings sections, filter tabs that map to
// routes). A bordered white strip; the active segment is a quiet slate tile.
export function SegmentedNav({ ariaLabel, items }: SegmentedNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
              active
                ? "bg-slate-100 text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="ml-1.5 text-slate-400 tabular-nums">{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

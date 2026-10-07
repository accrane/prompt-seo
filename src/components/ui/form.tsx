import type { CSSProperties, ReactNode } from "react";

export const inputClasses =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";

/** Multi-line variant: no fixed height. */
export const textareaClasses =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";

export const selectClasses = `${inputClasses} pr-8`;

export const checkboxClasses = "h-4 w-4 rounded-sm border-slate-300 accent-[var(--brand)]";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="type-label mb-1.5 block text-slate-500" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Table-style grid used for every record list. `columns` is a raw CSS
 * grid-template-columns value (e.g. "minmax(240px,2fr) 120px 140px"); it is
 * passed down through a CSS variable so rows stay server-component friendly.
 */
export function Table({
  columns,
  minWidth = "min-w-[720px]",
  children,
}: {
  columns: string;
  minWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className={`${minWidth} divide-y divide-slate-200`}
        style={{ "--cols": columns } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <div className="type-label grid grid-cols-[var(--cols)] items-center gap-3 px-5 py-2 text-slate-500">
      {children}
    </div>
  );
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[var(--cols)] items-center gap-3 px-5 py-3 text-sm ${className}`}
    >
      {children}
    </div>
  );
}

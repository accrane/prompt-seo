import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes inner padding so tables can run edge to edge. */
  flush?: boolean;
  tone?: "default" | "danger";
};

// Flat bordered panel (no shadow). Header carries a small semibold title and
// a muted description, with optional right-aligned actions.
export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  flush = false,
  tone = "default",
}: CardProps) {
  const border = tone === "danger" ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white";
  return (
    <section className={`rounded-lg border ${border} ${className}`}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-slate-950">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? "" : "px-5 py-4"}>{children}</div>
    </section>
  );
}

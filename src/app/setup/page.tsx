import type { Metadata } from "next";

import { AdminThemeScope } from "@/components/admin/admin-theme";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { configProblems } from "@/lib/config-check";

export const metadata: Metadata = { title: "Setup" };

// Shown by the proxy whenever required server configuration is missing, so
// a bad deploy explains itself instead of throwing an opaque error.
export default function SetupPage() {
  const problems = configProblems();

  return (
    <AdminThemeScope>
      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-10">
        <section className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="type-label text-slate-500">Prompt SEO</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {problems.length ? "Configuration incomplete" : "Configuration looks good"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {problems.length
              ? "These environment variables are missing or malformed on this deployment. Fix them in .env.local (or Vercel → Settings → Environment Variables), then restart or redeploy."
              : "Everything required is set."}
          </p>

          {problems.length ? (
            <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {problems.map((p) => (
                <li className="flex items-start justify-between gap-4 px-4 py-3" key={p.name}>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-slate-950">{p.name}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{p.problem}</p>
                  </div>
                  <StatusBadge tone="danger">Fix</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <ButtonLink href="/" variant="primary">
                Go to projects
              </ButtonLink>
            </div>
          )}
        </section>
      </main>
    </AdminThemeScope>
  );
}

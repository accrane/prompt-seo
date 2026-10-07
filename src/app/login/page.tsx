import type { Metadata } from "next";

import { AdminThemeScope } from "@/components/admin/admin-theme";
import { SubmitButton } from "@/components/app/submit-button";
import { BrandMark } from "@/components/branding/brand-mark";
import { signIn } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Sign in" };

const inputClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 transition";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const errorText = typeof error === "string" ? error : undefined;
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <AdminThemeScope>
      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-10">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-5 w-auto text-[var(--brand-mark)]" />
              <p className="type-label text-slate-500">Prompt SEO</p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Sign in</h1>
            <p className="text-sm leading-6 text-slate-500">
              Same login as WP Manager and the Site in a Day admin.
            </p>
          </div>

          {errorText ? (
            <div
              className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {errorText}
            </div>
          ) : null}

          <form action={signIn} className="mt-8 space-y-5">
            {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className={inputClasses}
                id="email"
                name="email"
                required
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className={inputClasses}
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            <SubmitButton className="h-10 w-full" pendingText="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        </section>
      </main>
    </AdminThemeScope>
  );
}

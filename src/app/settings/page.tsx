import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { CopyableValue } from "@/components/admin/copyable-value";
import { Flash } from "@/components/app/flash";
import { SubmitButton } from "@/components/app/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { disconnectGoogle } from "@/lib/actions/google";
import { requireOperator } from "@/lib/auth";
import { DEFAULT_EFFORT, EXTRACT_MODEL, RUN_MODEL } from "@/lib/claude";
import { configProblems } from "@/lib/config-check";
import { hasCredentialsKey } from "@/lib/crypto";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { googleConfigured, listConnections, redirectUri } from "@/lib/google/oauth";
import { appOrigin } from "@/lib/request";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const operator = await requireOperator();
  const { flash, error } = await searchParams;
  const problems = configProblems();
  const connections = await listConnections();
  const callback = redirectUri(await appOrigin());

  const rows = [
    ["Prompt model", `${RUN_MODEL} (default effort ${DEFAULT_EFFORT})`],
    ["Extraction model", `${EXTRACT_MODEL} (turns output into pages and checklist items)`],
    ["Web search", "On for every run, up to 8 searches per request"],
    ...(process.env.NODE_ENV !== "production" && process.env.CLAUDE_STAND_IN_DIR
      ? [
          [
            "Stand-in mode",
            `On: runs wait for replies in ${process.env.CLAUDE_STAND_IN_DIR} instead of calling Claude`,
          ],
        ]
      : []),
    ["Team", "Shared with WP Manager: add teammates on its Settings page"],
  ];

  const googleSetup = [
    { ok: Boolean(env.GOOGLE_CLIENT_ID), label: "GOOGLE_CLIENT_ID" },
    { ok: Boolean(env.GOOGLE_CLIENT_SECRET), label: "GOOGLE_CLIENT_SECRET" },
    { ok: hasCredentialsKey(), label: "CREDENTIALS_KEY (same value as WP Manager)" },
  ];

  return (
    <AppShell
      description="How this app is configured."
      operatorEmail={operator.email}
      title="Settings"
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Google Search Console</h2>
          {connections.length ? (
            <StatusBadge tone="success">Connected</StatusBadge>
          ) : googleConfigured() ? (
            <StatusBadge>Not connected</StatusBadge>
          ) : (
            <StatusBadge tone="warning">Needs setup</StatusBadge>
          )}
        </header>
        <div className="space-y-4 px-5 py-4 text-sm">
          <p className="text-slate-600">
            Connect a Google account that can see your clients&apos; Search Console properties
            (read-only). Each project then picks its property on the Intake page and pulls its data
            with one click.
          </p>

          {connections.length ? (
            <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
              {connections.map((c) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                  key={c.id}
                >
                  <span>
                    <span className="font-medium text-slate-950">{c.email}</span>
                    <span className="text-slate-500"> · connected {formatDate(c.created_at)}</span>
                  </span>
                  <form action={disconnectGoogle.bind(null, c.id)}>
                    <SubmitButton pendingText="Disconnecting…" size="sm" variant="ghost">
                      Disconnect
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}

          {googleConfigured() ? (
            <ButtonLink
              href="/api/google/connect?next=/settings"
              size="sm"
              variant={connections.length ? "secondary" : "primary"}
            >
              {connections.length ? "Connect another account" : "Connect Google account"}
            </ButtonLink>
          ) : (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">One-time setup in Google Cloud</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-slate-700">
                <li>
                  In Google Cloud Console, create (or pick) a project and enable the{" "}
                  <b>Google Search Console API</b>.
                </li>
                <li>
                  <b>OAuth consent screen</b>: choose <i>Internal</i> if bellaworksweb.com is a
                  Google Workspace domain; otherwise <i>External</i>, and add your Google account as
                  a test user.
                </li>
                <li>
                  <b>Credentials → Create credentials → OAuth client ID → Web application</b>. Add
                  this authorized redirect URI:
                  <div className="mt-1.5">
                    <CopyableValue value={callback} />
                  </div>
                </li>
                <li>
                  Put the client ID and secret in .env.local (and Vercel), then restart the app.
                </li>
              </ol>
              <ul className="space-y-1">
                {googleSetup.map((s) => (
                  <li className="flex items-center gap-2" key={s.label}>
                    <StatusBadge tone={s.ok ? "success" : "warning"}>
                      {s.ok ? "Set" : "Missing"}
                    </StatusBadge>
                    <span className="font-mono text-xs text-slate-700">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Configuration</h2>
          {problems.length ? (
            <StatusBadge tone="danger">
              {problems.length} problem{problems.length === 1 ? "" : "s"}
            </StatusBadge>
          ) : (
            <StatusBadge tone="success">OK</StatusBadge>
          )}
        </header>
        <dl className="divide-y divide-slate-200">
          {rows.map(([k, v]) => (
            <div className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[200px_1fr]" key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </AppShell>
  );
}

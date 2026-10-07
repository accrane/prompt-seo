"use client";

// Client-facing: never show the underlying error text here.
export default function ClientPlanError() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
      <h1 className="text-2xl font-semibold text-slate-950">This plan couldn&apos;t load</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-slate-700">
        Please try again in a few minutes. If it keeps happening, reply to the email this link came
        in.
      </p>
    </main>
  );
}

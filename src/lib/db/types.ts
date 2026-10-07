import type { PromptId } from "@/lib/prompts/registry";

export type Project = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  website_url: string;
  wpm_site_id: string | null;
  profile: Record<string, string>;
  monthly_budget_usd: number;
  status: "active" | "archived";
  google_connection_id: string | null;
  gsc_property: string | null;
  gsc_pulled_at: string | null;
  share_token: string | null;
};

export type DataSource = {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  kind: string;
  content: string;
  source: "paste" | "upload" | "fetch" | "gsc" | "pagespeed";
  filename: string | null;
};

export type RunStatus = "queued" | "running" | "review" | "approved" | "failed" | "canceled";

export type Run = {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  prompt: PromptId;
  page_id: string | null;
  status: RunStatus;
  model: string;
  effort: string;
  prompt_text: string;
  inputs: Record<string, string>;
  total_steps: number;
  lease_until: string | null;
  error: string | null;
  extracted: Extracted | null;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  web_searches: number;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
};

export type StepStatus = "pending" | "running" | "done" | "failed";

export type RunStep = {
  id: string;
  created_at: string;
  updated_at: string;
  run_id: string;
  idx: number;
  section: string;
  status: StepStatus;
  messages: unknown[];
  output_md: string;
  edited_md: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type PageAction = "new" | "rewrite" | "merge" | "redirect";
export type PageStatus = "planned" | "drafting" | "drafted" | "published" | "skipped";

export type Page = {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  source_run_id: string | null;
  url: string;
  page_type: string | null;
  canonical_query: string | null;
  supporting_queries: string[];
  intent: string | null;
  journey_stage: string | null;
  job: string | null;
  conversion_point: string | null;
  build_month: number | null;
  action: PageAction;
  status: PageStatus;
  draft_run_id: string | null;
  client_visible: boolean;
};

export type Task = {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  source_run_id: string | null;
  title: string;
  detail: string | null;
  owner: string | null;
  due_on: string | null;
  done_at: string | null;
  sort: number;
  client_visible: boolean;
  /** "technical" items are audit findings: one per affected URL. */
  category: "checklist" | "technical";
  url: string | null;
  note: string | null;
  /** Show an answer box for this item on the client plan page. */
  asks_answer: boolean;
  client_answer: string | null;
  client_answered_at: string | null;
};

export type ExtractedTask = {
  title: string;
  detail: string;
  owner: "developer" | "content" | "seo" | "operator";
  due_in_days: number | null;
};

export type ExtractedPage = {
  url: string;
  page_type: string;
  canonical_query: string;
  supporting_queries: string[];
  intent: string;
  journey_stage: string;
  job: string;
  conversion_point: string;
  build_month: number | null;
  action: PageAction;
};

export type Extracted = {
  tasks: ExtractedTask[];
  pages?: ExtractedPage[];
  error?: string;
};

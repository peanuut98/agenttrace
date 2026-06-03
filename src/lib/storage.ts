/**
 * Storage adapter — browser side.
 *
 * Switches between Supabase (real auth) and localStorage (Dev Mode). Only
 * functions that legitimately run in the browser live here, since
 * localStorage is browser-only and importing the server-side Supabase client
 * here would pull `next/headers` into Client Component bundles.
 *
 * For server-side reads, see `lib/storage-server.ts`.
 */

import { DEV_MODE, DEV_USER_ID } from "@/lib/dev-mode";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import type { NewProjectInput, Project } from "@/types/project";
import type { NewRunInput, Run, RunStep } from "@/types/run";
import type { Receipt, ReceiptJson } from "@/types/receipt";

const PROJECTS_KEY = "agenttrace.projects";
const RUNS_KEY = "agenttrace.runs";
const STEPS_KEY = "agenttrace.run_steps";
const RECEIPTS_KEY = "agenttrace.receipts";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjectsBrowser(): Promise<Project[]> {
  if (DEV_MODE) {
    return readArray<Project>(PROJECTS_KEY).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProjectBrowser(id: string): Promise<Project | null> {
  if (DEV_MODE) {
    return readArray<Project>(PROJECTS_KEY).find((p) => p.id === id) ?? null;
  }
  const supabase = createBrowserSupabase();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project | null) ?? null;
}

export async function createProjectBrowser(
  input: NewProjectInput,
): Promise<Project> {
  const now = nowIso();

  if (DEV_MODE) {
    const project: Project = {
      id: newId(),
      user_id: DEV_USER_ID,
      name: input.name,
      description: input.description ?? null,
      github_url: input.github_url ?? null,
      demo_url: input.demo_url ?? null,
      wallet_address: input.wallet_address ?? null,
      chain: input.chain ?? null,
      created_at: now,
      updated_at: now,
    };
    const all = readArray<Project>(PROJECTS_KEY);
    writeArray(PROJECTS_KEY, [project, ...all]);
    return project;
  }

  const supabase = createBrowserSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("You must be signed in to create a project.");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? null,
      github_url: input.github_url ?? null,
      demo_url: input.demo_url ?? null,
      wallet_address: input.wallet_address ?? null,
      chain: input.chain ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create project.");
  return data as Project;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function listRunsForProjectBrowser(
  projectId: string,
): Promise<Run[]> {
  if (DEV_MODE) {
    return readArray<Run>(RUNS_KEY)
      .filter((r) => r.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Run[];
}

export async function createRunWithStepsBrowser(
  input: NewRunInput,
): Promise<Run> {
  const now = nowIso();

  if (DEV_MODE) {
    const run: Run = {
      id: newId(),
      project_id: input.project_id,
      user_id: DEV_USER_ID,
      title: input.title,
      agent_name: input.agent_name,
      status: input.status,
      risk_level: input.risk_level,
      created_at: now,
      updated_at: now,
    };
    const steps: RunStep[] = input.steps.map((step, index) => ({
      id: newId(),
      run_id: run.id,
      step_type: step.step_type,
      title: step.title,
      content: step.content,
      status: step.status,
      order_index: index,
      created_at: now,
    }));
    writeArray(RUNS_KEY, [run, ...readArray<Run>(RUNS_KEY)]);
    writeArray(STEPS_KEY, [...readArray<RunStep>(STEPS_KEY), ...steps]);
    return run;
  }

  // Supabase path. Tables (`runs`, `run_steps`) are not in the Day 2 schema
  // yet — this branch is reachable only after the Day 3 migration. Wired up
  // so flipping Dev Mode off later requires no extra work here.
  const supabase = createBrowserSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("You must be signed in to create a run.");
  }

  const { data: runRow, error: runError } = await supabase
    .from("runs")
    .insert({
      project_id: input.project_id,
      user_id: user.id,
      title: input.title,
      agent_name: input.agent_name,
      status: input.status,
      risk_level: input.risk_level,
    })
    .select("*")
    .single();
  if (runError || !runRow) {
    throw runError ?? new Error("Failed to create run.");
  }

  const stepsPayload = input.steps.map((step, index) => ({
    run_id: runRow.id,
    step_type: step.step_type,
    title: step.title,
    content: step.content,
    status: step.status,
    order_index: index,
  }));

  const { error: stepsError } = await supabase
    .from("run_steps")
    .insert(stepsPayload);
  if (stepsError) throw stepsError;

  return runRow as Run;
}

export async function getRunBrowser(id: string): Promise<Run | null> {
  if (DEV_MODE) {
    return readArray<Run>(RUNS_KEY).find((r) => r.id === id) ?? null;
  }
  const supabase = createBrowserSupabase();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Run | null) ?? null;
}

export async function listStepsForRunBrowser(
  runId: string,
): Promise<RunStep[]> {
  if (DEV_MODE) {
    return readArray<RunStep>(STEPS_KEY)
      .filter((s) => s.run_id === runId)
      .sort((a, b) => a.order_index - b.order_index);
  }
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("run_steps")
    .select("*")
    .eq("run_id", runId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RunStep[];
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

export type SaveReceiptInput = {
  run_id: string;
  project_id: string;
  receipt_json: ReceiptJson;
  receipt_hash: string;
  markdown_export: string;
};

export async function getReceiptForRunBrowser(
  runId: string,
): Promise<Receipt | null> {
  if (DEV_MODE) {
    return (
      readArray<Receipt>(RECEIPTS_KEY).find((r) => r.run_id === runId) ?? null
    );
  }
  const supabase = createBrowserSupabase();
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  return (data as Receipt | null) ?? null;
}

/**
 * Upsert by `run_id`. A run has at most one receipt — regenerating overwrites.
 */
export async function saveReceiptBrowser(
  input: SaveReceiptInput,
): Promise<Receipt> {
  const now = nowIso();

  if (DEV_MODE) {
    const all = readArray<Receipt>(RECEIPTS_KEY);
    const existing = all.find((r) => r.run_id === input.run_id);
    const receipt: Receipt = existing
      ? {
          ...existing,
          receipt_json: input.receipt_json,
          receipt_hash: input.receipt_hash,
          markdown_export: input.markdown_export,
          updated_at: now,
        }
      : {
          id: newId(),
          run_id: input.run_id,
          project_id: input.project_id,
          receipt_json: input.receipt_json,
          receipt_hash: input.receipt_hash,
          markdown_export: input.markdown_export,
          created_at: now,
          updated_at: now,
        };
    const next = existing
      ? all.map((r) => (r.run_id === input.run_id ? receipt : r))
      : [receipt, ...all];
    writeArray(RECEIPTS_KEY, next);
    return receipt;
  }

  // Supabase path. Table not part of the Day 2 schema yet — Day 4 territory.
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("receipts")
    .upsert(
      {
        run_id: input.run_id,
        project_id: input.project_id,
        receipt_json: input.receipt_json,
        receipt_hash: input.receipt_hash,
        markdown_export: input.markdown_export,
      },
      { onConflict: "run_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to save receipt.");
  return data as Receipt;
}

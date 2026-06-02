/**
 * Storage adapter — server side.
 *
 * Kept separate from `lib/storage.ts` so that browser bundles never pull in
 * `next/headers`. Only Server Components / Route Handlers should import this.
 *
 * In Dev Mode these helpers return empty / null because the server can't read
 * localStorage; the matching Client Components hydrate from the browser
 * adapter instead. They exist mainly for the non-Dev path.
 */

import "server-only";
import { DEV_MODE, DEV_USER_ID } from "@/lib/dev-mode";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { Project } from "@/types/project";

export async function getServerUserId(): Promise<string | null> {
  if (DEV_MODE) return DEV_USER_ID;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listProjectsServer(): Promise<Project[]> {
  if (DEV_MODE) return [];
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Project[];
}

export async function getProjectServer(id: string): Promise<Project | null> {
  if (DEV_MODE) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project | null) ?? null;
}

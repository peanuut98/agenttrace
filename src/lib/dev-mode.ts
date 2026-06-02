/**
 * Dev-mode helpers.
 *
 * NEXT_PUBLIC_DEV_MODE=true bypasses Supabase auth and persists projects/runs
 * to localStorage. The flag is read from the public env so it works in both
 * Server Components and Client Components — the value is the same in both.
 */

export const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export const DEV_USER_ID = "dev-user";

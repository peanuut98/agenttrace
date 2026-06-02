import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // The Dashboard is rendered entirely on the client so the storage adapter
  // can read from either localStorage (Dev Mode) or Supabase using the
  // browser client. The Server Component middleware already gated this route.
  return <DashboardClient />;
}

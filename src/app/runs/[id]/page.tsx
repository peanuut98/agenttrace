import { RunDetailClient } from "./run-detail-client";

export const dynamic = "force-dynamic";

type RunPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RunDetailPage({ params }: RunPageProps) {
  const { id } = await params;
  return <RunDetailClient runId={id} />;
}

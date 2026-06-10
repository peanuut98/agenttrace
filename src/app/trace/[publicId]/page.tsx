import { PublicTraceClient } from "./public-trace-client";

type PublicTracePageProps = {
  params: Promise<{ publicId: string }>;
};

export default async function PublicTracePage({
  params,
}: PublicTracePageProps) {
  const { publicId } = await params;
  return <PublicTraceClient publicId={publicId} />;
}

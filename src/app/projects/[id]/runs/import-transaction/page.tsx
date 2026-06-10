import { ImportTransactionClient } from "./import-transaction-client";

export const dynamic = "force-dynamic";

type ImportTransactionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImportTransactionPage({
  params,
}: ImportTransactionPageProps) {
  const { id } = await params;
  return <ImportTransactionClient projectId={id} />;
}

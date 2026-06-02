import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return <ProjectDetailClient projectId={id} />;
}

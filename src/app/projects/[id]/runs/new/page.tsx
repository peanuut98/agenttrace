import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewRunForm } from "./new-run-form";

type NewRunPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewRunPage({ params }: NewRunPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="size-4" />
            Back to project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create an Agent run</CardTitle>
          <CardDescription>
            Capture one full execution — intent, plan, tools, payment, wallet,
            on-chain tx, verification, and the final result.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRunForm projectId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

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
import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new project</CardTitle>
          <CardDescription>
            A project groups Agent runs and receipts under one Web3 workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}

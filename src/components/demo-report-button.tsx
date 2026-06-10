"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDemoReport } from "@/lib/demo-report";

type DemoReportButtonProps = {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
};

export function DemoReportButton({
  variant = "default",
  size = "default",
  className,
  children,
}: DemoReportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateDemoReport();
      router.push(`/trace/${result.publicId}`);
    } catch (error) {
      console.error("Failed to generate demo report:", error);
      alert("Failed to generate demo report. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating demo report…
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          {children ?? "Generate Demo Report"}
        </>
      )}
    </Button>
  );
}

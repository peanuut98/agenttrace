"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateRunPublicStatusBrowser } from "@/lib/storage";
import { generatePublicId } from "@/lib/public-id";
import type { Run } from "@/types/run";

type SharePanelProps = {
  run: Run;
  onRunChange: (run: Run) => void;
};

export function SharePanel({ run, onRunChange }: SharePanelProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPublic = run.is_public === true;
  const publicId = run.public_id;
  const publicUrl =
    typeof window !== "undefined" && publicId
      ? `${window.location.origin}/trace/${publicId}`
      : "";

  async function handleMakePublic() {
    setLoading(true);
    try {
      const newPublicId = generatePublicId();
      const updated = await updateRunPublicStatusBrowser(
        run.id,
        true,
        newPublicId,
      );
      onRunChange(updated);
    } catch (error) {
      console.error("Failed to make run public:", error);
      alert("Failed to make run public. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpublish() {
    if (
      !confirm(
        "This will make the public link inaccessible. Are you sure you want to unpublish?",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const updated = await updateRunPublicStatusBrowser(run.id, false, null);
      onRunChange(updated);
    } catch (error) {
      console.error("Failed to unpublish run:", error);
      alert("Failed to unpublish run. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleViewPublic() {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPublic ? (
            <>
              <Globe className="size-5" />
              Share Proof-of-Execution
            </>
          ) : (
            <>
              <Lock className="size-5" />
              Share Proof-of-Execution
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isPublic
            ? "This run is publicly accessible. Anyone with the link can view the full execution trace."
            : "Make this run public to generate a shareable proof-of-execution link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPublic ? (
          <Button onClick={handleMakePublic} disabled={loading} className="w-full">
            <Globe className="size-4" />
            Make Public
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleViewPublic}
                className="flex-1"
              >
                <ExternalLink className="size-4" />
                View Public Page
              </Button>
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={loading}
                className="flex-1"
              >
                <Lock className="size-4" />
                Unpublish
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

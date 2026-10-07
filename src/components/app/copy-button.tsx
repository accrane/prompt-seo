"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copies text (a section's Markdown) to the clipboard. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      size="sm"
      variant="ghost"
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

import { renderMarkdown } from "@/lib/markdown";

/** Rendered model output. Raw HTML in the source is escaped by renderMarkdown. */
export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div
      className={`md-body ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}

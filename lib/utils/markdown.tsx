import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

/**
 * Safe markdown renderer.
 * react-markdown ignores raw HTML by default (no rehype-raw plugin),
 * so user-supplied markdown is rendered as text/elements with no XSS surface.
 */
export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs",
        "[&_a]:text-primary [&_a]:underline",
        className,
      )}
    >
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}

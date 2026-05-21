import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Safe markdown renderer.
 * react-markdown ignores raw HTML by default (no rehype-raw plugin),
 * so user-supplied markdown is rendered as text/elements with no XSS surface.
 *
 * remark-gfm abilita le task list (`- [ ]` / `- [x]`): in sola lettura sono
 * checkbox `disabled`. Con `interactive` + `onToggleCheckbox` diventano
 * cliccabili: l'indice passato al callback è la posizione zero-based della
 * checkbox in ordine di documento, contratto condiviso con
 * `toggleTaskListItem` (vedi lib/utils/markdown-tasklist.ts).
 */
export function Markdown({
  source,
  className,
  interactive = false,
  onToggleCheckbox,
}: {
  source: string;
  className?: string;
  interactive?: boolean;
  onToggleCheckbox?: (index: number) => void;
}) {
  // Contatore allocato a ogni render e catturato dalla closure dell'override:
  // react-markdown renderizza gli <input> in ordine di documento, quindi gli
  // indici escono 0,1,2,… nello stesso ordine di toggleTaskListItem.
  let checkboxIndex = -1;
  const clickable = interactive && Boolean(onToggleCheckbox);

  const components: Components | undefined = clickable
    ? {
        // Non spreddiamo `props` (conterrebbe `node`, prop non valida sul DOM):
        // con markdown safe + remark-gfm gli unici input sono checkbox di task list.
        input(props) {
          if (props.type !== "checkbox") return <input type={props.type} readOnly />;
          const myIndex = ++checkboxIndex;
          return (
            <input
              type="checkbox"
              checked={Boolean(props.checked)}
              onChange={() => onToggleCheckbox?.(myIndex)}
              className="mr-1.5 cursor-pointer align-middle accent-coral"
            />
          );
        },
      }
    : undefined;

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
        "[&_li:has(input[type=checkbox])]:list-none",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs",
        "[&_a]:text-primary [&_a]:underline",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

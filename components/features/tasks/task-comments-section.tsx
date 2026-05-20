"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  createCommentAction,
  deleteCommentAction,
} from "@/lib/actions/comments";
import type { CommentWithAuthor } from "@/lib/domain/comments";
import { Markdown } from "@/lib/utils/markdown";

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function TaskCommentsSection({
  taskId,
  initialComments,
  currentUserId,
}: {
  taskId: string;
  initialComments: CommentWithAuthor[];
  currentUserId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [optimisticComments, addOptimistic] = useOptimistic<
    CommentWithAuthor[],
    CommentWithAuthor
  >(comments, (curr, optimistic) => [...curr, optimistic]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setDraft("");
    startTransition(async () => {
      addOptimistic({
        id: `optimistic-${Date.now()}`,
        taskId,
        authorId: currentUserId,
        bodyMarkdown: text,
        attachments: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: currentUserId,
          name: null,
          email: "",
          image: null,
        },
      });
      const res = await createCommentAction(taskId, text);
      if (!res.ok) {
        setError(res.error);
        setDraft(text);
        return;
      }
      setComments((prev) => [...prev, res.data]);
    });
  }

  function remove(commentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCommentAction(commentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });
  }

  const count = optimisticComments.length;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        Commenti {count > 0 && <span className="text-muted-foreground">{count}</span>}
      </button>

      {!collapsed && (
        <>
          {optimisticComments.length > 0 && (
            <ul className="space-y-4">
              {optimisticComments.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <Avatar className="size-7">
                    {c.author.image ? (
                      <AvatarImage src={c.author.image} alt={c.author.name ?? c.author.email} />
                    ) : null}
                    <AvatarFallback className="text-[0.625em]">
                      {initials(c.author.name, c.author.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="font-medium">{c.author.name ?? c.author.email}</span>
                      <span className="text-muted-foreground">
                        {format(c.createdAt, "d MMM HH:mm")}
                      </span>
                      {c.authorId === currentUserId && !c.id.startsWith("optimistic-") && (
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          disabled={pending}
                          aria-label="Elimina commento"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <Markdown source={c.bodyMarkdown} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submit} className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={pending}
              placeholder="Commenta... (⌘↵ per inviare)"
              rows={2}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Commenta
              </button>
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </form>
        </>
      )}
    </section>
  );
}

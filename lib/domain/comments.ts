/**
 * Comment domain — Drizzle helpers per i commenti task-scoped.
 *
 * Server-side only. Multi-tenancy guard sui task: ogni operazione verifica
 * che il task referenziato appartenga all'organizationId fornito.
 */

import { and, asc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Comment } from "@/lib/db/schema";

export type CommentWithAuthor = Comment & {
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

export async function getCommentsByTaskId(opts: {
  taskId: string;
  organizationId: string;
}): Promise<CommentWithAuthor[]> {
  const taskRow = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, opts.taskId),
      eq(schema.task.organizationId, opts.organizationId),
    ),
    columns: { id: true },
  });
  if (!taskRow) return [];

  const rows = await db
    .select({
      id: schema.comment.id,
      taskId: schema.comment.taskId,
      authorId: schema.comment.authorId,
      bodyMarkdown: schema.comment.bodyMarkdown,
      attachments: schema.comment.attachments,
      createdAt: schema.comment.createdAt,
      updatedAt: schema.comment.updatedAt,
      authorName: schema.user.name,
      authorEmail: schema.user.email,
      authorImage: schema.user.image,
    })
    .from(schema.comment)
    .innerJoin(schema.user, eq(schema.user.id, schema.comment.authorId))
    .where(eq(schema.comment.taskId, opts.taskId))
    .orderBy(asc(schema.comment.createdAt));

  return rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    authorId: r.authorId,
    bodyMarkdown: r.bodyMarkdown,
    attachments: r.attachments,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: {
      id: r.authorId,
      name: r.authorName,
      email: r.authorEmail,
      image: r.authorImage,
    },
  }));
}

/**
 * Conteggio commenti per ogni taskId fornito. Batch query unica.
 * Ritorna una Map taskId → count. Task senza commenti non sono nella Map.
 */
export async function getCommentCountByTask(opts: {
  taskIds: string[];
}): Promise<Map<string, number>> {
  if (opts.taskIds.length === 0) return new Map();
  const rows = await db
    .select({
      taskId: schema.comment.taskId,
      count: schema.comment.id,
    })
    .from(schema.comment)
    .where(inArray(schema.comment.taskId, opts.taskIds));

  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.taskId, (counts.get(r.taskId) ?? 0) + 1);
  }
  return counts;
}

export async function createComment(opts: {
  taskId: string;
  organizationId: string;
  authorId: string;
  bodyMarkdown: string;
}): Promise<Comment> {
  const trimmed = opts.bodyMarkdown.trim();
  if (!trimmed) throw new Error("Commento vuoto");

  // Multi-tenancy guard: il task deve esistere nella org
  const taskRow = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, opts.taskId),
      eq(schema.task.organizationId, opts.organizationId),
    ),
    columns: { id: true },
  });
  if (!taskRow) throw new Error("Task non trovato");

  const [created] = await db
    .insert(schema.comment)
    .values({
      taskId: opts.taskId,
      authorId: opts.authorId,
      bodyMarkdown: trimmed,
    })
    .returning();
  if (!created) throw new Error("Insert commento fallito");
  return created;
}

/**
 * Cancella un commento. Solo l'autore può cancellare i propri commenti.
 */
export async function deleteComment(opts: {
  commentId: string;
  authorId: string;
}): Promise<void> {
  const result = await db
    .delete(schema.comment)
    .where(
      and(
        eq(schema.comment.id, opts.commentId),
        eq(schema.comment.authorId, opts.authorId),
      ),
    )
    .returning({ id: schema.comment.id });
  if (result.length === 0) {
    throw new Error("Commento non trovato o non autorizzato");
  }
}

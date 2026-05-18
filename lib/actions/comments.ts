"use server";

/**
 * Server Actions per i commenti dei task.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  createComment,
  deleteComment,
  getCommentsByTaskId,
  type CommentWithAuthor,
} from "@/lib/domain/comments";

import type { ActionResult } from "./tasks";

export async function fetchTaskCommentsAction(
  taskId: string,
): Promise<ActionResult<CommentWithAuthor[]>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const comments = await getCommentsByTaskId({ taskId, organizationId });
    return { ok: true, data: comments };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore fetch commenti",
    };
  }
}

const TASK_VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

function revalidateTaskViews() {
  for (const p of TASK_VIEW_PATHS) revalidatePath(p);
  revalidatePath("/", "layout");
}

const createCommentSchema = z.object({
  taskId: z.string().min(1),
  bodyMarkdown: z.string().trim().min(1, "Commento vuoto").max(10_000),
});

export async function createCommentAction(
  taskId: string,
  bodyMarkdown: string,
): Promise<ActionResult<CommentWithAuthor>> {
  try {
    const parsed = createCommentSchema.safeParse({ taskId, bodyMarkdown });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const { user, organizationId } = await requireActiveOrganization();
    const created = await createComment({
      taskId: parsed.data.taskId,
      organizationId,
      authorId: user.id,
      bodyMarkdown: parsed.data.bodyMarkdown,
    });
    revalidateTaskViews();
    return {
      ok: true,
      data: {
        ...created,
        author: {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
        },
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore creazione commento",
    };
  }
}

export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireActiveOrganization();
    await deleteComment({ commentId, authorId: user.id });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore eliminazione commento",
    };
  }
}

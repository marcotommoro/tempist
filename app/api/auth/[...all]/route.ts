/**
 * Better Auth catchall route handler.
 * Gestisce: /api/auth/sign-in, /api/auth/sign-up, /api/auth/callback/*, /api/auth/magic-link/*, etc.
 */

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/config";

export const { GET, POST } = toNextJsHandler(auth.handler);

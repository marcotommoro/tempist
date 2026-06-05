/**
 * Better Auth client (browser).
 * Use in Client Components: `import { authClient } from "@/lib/auth/client"`.
 */

import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // When baseURL is undefined, Better Auth uses window.location.origin in the
  // browser (see better-auth/dist/utils/url.mjs) — always correct since auth is
  // served same-origin from /api/auth, in both dev and production. Do NOT add a
  // "http://localhost:3000" fallback: NEXT_PUBLIC_* vars are inlined at build
  // time, so an absent var would otherwise get hard-coded into the bundle.
  // Only set these env vars if auth runs on a different domain than the app.
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    undefined,
  plugins: [magicLinkClient(), organizationClient(), adminClient()],
});

export const { signIn, signOut, useSession, organization } = authClient;

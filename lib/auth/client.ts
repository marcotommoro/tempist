/**
 * Better Auth client (browser).
 * Use in Client Components: `import { authClient } from "@/lib/auth/client"`.
 */

import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000",
  plugins: [magicLinkClient(), organizationClient()],
});

export const { signIn, signOut, useSession, organization } = authClient;

import { notFound } from "next/navigation";

import { getPlatformRole } from "@/lib/auth/platform-role";
import { requireSession } from "@/lib/auth/workspace";

export { getPlatformRole, type PlatformRole } from "@/lib/auth/platform-role";

export async function requirePlatformAdmin() {
  const session = await requireSession();
  if (getPlatformRole(session.user) !== "admin") {
    notFound();
  }
  return { user: session.user };
}

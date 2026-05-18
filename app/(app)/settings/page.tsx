import { headers } from "next/headers";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listActiveTokens } from "@/lib/domain/ical";
import { IcalSection } from "@/components/features/settings/ical-section";

export default async function SettingsPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const tokens = await listActiveTokens({
    userId: user.id,
    organizationId,
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <IcalSection tokens={tokens} baseUrl={baseUrl} />
    </div>
  );
}

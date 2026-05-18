import { headers } from "next/headers";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listActiveTokens } from "@/lib/domain/ical";
import { listAccountsForUser } from "@/lib/domain/calendar-accounts";
import { IcalSection } from "@/components/features/settings/ical-section";
import { DigestSection } from "@/components/features/settings/digest-section";
import { CalendarSection } from "@/components/features/settings/calendar-section";
import { WeeklyReportSection } from "@/components/features/settings/weekly-report-section";
import { ThemeSection } from "@/components/features/settings/theme-section";

type Search = { gcal_connected?: string; gcal_error?: string };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { user, organizationId } = await requireActiveOrganization();

  const [tokens, accounts] = await Promise.all([
    listActiveTokens({ userId: user.id, organizationId }),
    listAccountsForUser({ userId: user.id, organizationId }),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const { gcal_connected, gcal_error } = await searchParams;
  const flash: { kind: "ok" | "err"; text: string } | null = gcal_connected
    ? { kind: "ok", text: "Google Calendar connesso." }
    : gcal_error
      ? { kind: "err", text: `Errore connessione: ${gcal_error}` }
      : null;

  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <ThemeSection />
      <IcalSection tokens={tokens} baseUrl={baseUrl} />
      <DigestSection userEmail={user.email} />
      <WeeklyReportSection />
      <CalendarSection
        accounts={accounts}
        googleConfigured={googleConfigured}
        flashMessage={flash}
      />
    </div>
  );
}

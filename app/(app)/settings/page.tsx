import Link from "next/link";
import { headers } from "next/headers";
import { Users } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listActiveTokens } from "@/lib/domain/ical";
import { listAccountsForUser } from "@/lib/domain/calendar-accounts";
import { IcalSection } from "@/components/features/settings/ical-section";
import { DigestSection } from "@/components/features/settings/digest-section";
import { CalendarSection } from "@/components/features/settings/calendar-section";
import { WeeklyReportSection } from "@/components/features/settings/weekly-report-section";
import { ThemeSection } from "@/components/features/settings/theme-section";
import { ImportSection } from "@/components/features/settings/import-section";
import { PageHeader } from "@/components/features/page-header/page-header";

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
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        meta={<span>{user.email}</span>}
      />
      <section className="space-y-3">
        <header className="space-y-1">
          <h2 className="font-display text-lg text-foreground">Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci il workspace attivo, i suoi membri e gli inviti.
          </p>
        </header>
        <Link
          href="/settings/workspace"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-foreground hover:bg-card"
        >
          <Users className="size-3.5" />
          Apri impostazioni workspace
        </Link>
      </section>
      <ThemeSection />
      <IcalSection tokens={tokens} baseUrl={baseUrl} />
      <DigestSection userEmail={user.email} />
      <WeeklyReportSection />
      <CalendarSection
        accounts={accounts}
        googleConfigured={googleConfigured}
        flashMessage={flash}
      />
      <ImportSection />
    </div>
  );
}

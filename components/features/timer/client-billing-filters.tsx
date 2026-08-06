import { QuickEntryPeriodFilters } from "./quick-entry-period-filters";
import { toDateParam, type BillingPreset } from "@/lib/utils/billing-period";

export function ClientBillingFilters({
  clientId,
  from,
  to,
  presetActive,
}: {
  clientId: string;
  from: Date;
  to: Date;
  presetActive: BillingPreset;
}) {
  const exportParams = new URLSearchParams({
    clientId,
    from: toDateParam(from),
    to: toDateParam(to),
  });

  return (
    <QuickEntryPeriodFilters
      basePath={`/clients/${clientId}`}
      from={from}
      to={to}
      presetActive={presetActive}
      exportHref={`/api/reports/time-entries.csv?${exportParams.toString()}`}
    />
  );
}

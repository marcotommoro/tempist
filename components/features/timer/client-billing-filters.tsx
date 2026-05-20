"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  from: Date;
  to: Date;
  presetActive: "month" | "last-month" | "all" | "custom";
};

function toDateParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function presetHref(clientId: string, preset: "month" | "last-month" | "all"): string {
  const params = new URLSearchParams({ clientId, preset });
  return `?${params.toString()}`;
}

export function ClientBillingFilters({ clientId, from, to, presetActive }: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState<Date>(from);
  const [customTo, setCustomTo] = useState<Date>(to);

  const exportParams = new URLSearchParams({
    clientId,
    from: toDateParam(from),
    to: toDateParam(to),
  });
  const exportHref = `/api/reports/time-entries.csv?${exportParams.toString()}`;

  function applyCustom() {
    const params = new URLSearchParams({
      from: toDateParam(customFrom),
      to: toDateParam(customTo),
    });
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden">
        <PresetLink
          href={presetHref(clientId, "month")}
          active={presetActive === "month"}
          label="Questo mese"
        />
        <PresetLink
          href={presetHref(clientId, "last-month")}
          active={presetActive === "last-month"}
          label="Mese scorso"
        />
        <PresetLink
          href={presetHref(clientId, "all")}
          active={presetActive === "all"}
          label="Tutto"
        />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card p-1">
        <DatePicker
          value={customFrom}
          onChange={(d) => d && setCustomFrom(d)}
          allowClear={false}
          placeholder="Da"
        />
        <span className="font-mono text-[0.625em] text-muted-foreground">→</span>
        <DatePicker
          value={customTo}
          onChange={(d) => d && setCustomTo(d)}
          allowClear={false}
          placeholder="A"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={applyCustom}
          className="h-7 px-2 text-[0.6875em] uppercase tracking-wider"
        >
          Applica
        </Button>
      </div>

      <a
        href={exportHref}
        download
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-accent"
      >
        <Download className="size-3.5" />
        Export CSV
      </a>
    </div>
  );
}

function PresetLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center px-3 font-mono text-[0.625em] uppercase tracking-wider transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

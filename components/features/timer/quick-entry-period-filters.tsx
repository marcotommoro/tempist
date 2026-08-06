"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  buildBillingHref,
  type BillingPreset,
  toDateParam,
} from "@/lib/utils/billing-period";
import { cn } from "@/lib/utils";

export function QuickEntryPeriodFilters({
  basePath,
  from,
  to,
  presetActive,
  preservedParams,
  exportHref,
}: {
  basePath: string;
  from: Date;
  to: Date;
  presetActive: BillingPreset;
  preservedParams?: Record<string, string>;
  exportHref?: string;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState<Date>(from);
  const [customTo, setCustomTo] = useState<Date>(to);

  function presetHref(preset: "month" | "last-month" | "all"): string {
    return buildBillingHref(basePath, {
      preset,
      extra: preservedParams,
    });
  }

  function applyCustom() {
    const href = buildBillingHref(basePath, {
      from: customFrom,
      to: customTo,
      extra: preservedParams,
    });
    router.push(href);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden">
        <PresetLink
          href={presetHref("month")}
          active={presetActive === "month"}
          label="Questo mese"
        />
        <PresetLink
          href={presetHref("last-month")}
          active={presetActive === "last-month"}
          label="Mese scorso"
        />
        <PresetLink
          href={presetHref("all")}
          active={presetActive === "all"}
          label="Tutto"
        />
      </div>

      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
        <DatePicker
          value={customFrom}
          onChange={(d) => d && setCustomFrom(d)}
          allowClear={false}
          placeholder="Da"
          displayFormat="d MMM yy"
          className="h-7 gap-1.5 px-2"
        />
        <span className="font-mono text-[0.625em] text-muted-foreground">→</span>
        <DatePicker
          value={customTo}
          onChange={(d) => d && setCustomTo(d)}
          allowClear={false}
          placeholder="A"
          displayFormat="d MMM yy"
          className="h-7 gap-1.5 px-2"
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

      {exportHref && (
        <a
          href={exportHref}
          download
          title="Export CSV"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Download className="size-3.5" />
          CSV
        </a>
      )}
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
        "inline-flex h-8 items-center px-2.5 font-mono text-[0.625em] uppercase tracking-wider transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

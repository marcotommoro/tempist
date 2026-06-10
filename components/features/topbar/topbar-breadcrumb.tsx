"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  today: "Today",
  inbox: "Inbox",
  upcoming: "Attività",
  projects: "Projects",
  clients: "Clients",
  filters: "Filters",
  timesheet: "Timesheet",
  reports: "Reports",
  settings: "Settings",
};

export function TopbarBreadcrumb() {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const label = seg
    ? (LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1))
    : "Today";

  return (
    <div className="flex items-center gap-1.5 text-[0.8125em] text-muted-foreground">
      <span>Workspace</span>
      <span className="text-mute">/</span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}

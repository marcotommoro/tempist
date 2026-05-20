import Link from "next/link";
import { LayoutList, FolderKanban } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TaskGroupMode } from "@/lib/utils/group-by-project";

function buildHref(basePath: string, group: TaskGroupMode, preserve?: Record<string, string>) {
  const params = new URLSearchParams();
  if (group === "project") params.set("group", "project");
  if (preserve) {
    for (const [key, value] of Object.entries(preserve)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function TaskListViewToggle({
  basePath,
  group,
  preserveParams,
}: {
  basePath: "/today" | "/upcoming";
  group: TaskGroupMode;
  preserveParams?: Record<string, string>;
}) {
  const isProject = group === "project";

  return (
    <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5 font-mono text-[0.625em] uppercase tracking-wider">
      <Link
        href={buildHref(basePath, "flat", preserveParams)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
          !isProject
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutList className="size-3" /> Flat
      </Link>
      <Link
        href={buildHref(basePath, "project", preserveParams)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
          isProject
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <FolderKanban className="size-3" /> Progetto
      </Link>
    </div>
  );
}

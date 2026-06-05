import { Badge } from "@/components/ui/badge";
import type { UserWithMetrics } from "@/lib/domain/platform-admin";
import { cn } from "@/lib/utils";

function formatHours(hours: number): string {
  return hours.toFixed(1);
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsersMetricsTable({ users }: { users: UserWithMetrics[] }) {
  if (users.length === 0) {
    return (
      <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
        Nessun utente trovato.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-[0.8125em]">
        <thead>
          <tr className="border-b border-border font-mono text-[0.625em] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="px-3 py-3 font-medium">Utente</th>
            <th className="px-3 py-3 font-medium">Ruolo</th>
            <th className="px-3 py-3 font-medium">Iscritto</th>
            <th className="px-3 py-3 font-medium text-right">Workspace</th>
            <th className="px-3 py-3 font-medium text-right">Task</th>
            <th className="px-3 py-3 font-medium text-right">Ore totali</th>
            <th className="px-3 py-3 font-medium text-right">Media/g</th>
            <th className="px-3 py-3 font-medium text-right">Media/m</th>
            <th className="px-3 py-3 font-medium">Ultima attività</th>
            <th className="px-3 py-3 font-medium">Sessione</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/60 transition-colors hover:bg-muted/30">
              <td className="px-3 py-3">
                <div className="font-medium text-foreground">{user.email}</div>
                {user.name ? (
                  <div className="text-xs text-muted-foreground">{user.name}</div>
                ) : null}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  {user.banned ? <Badge variant="destructive">banned</Badge> : null}
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-muted-foreground">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{user.workspaceCount}</td>
              <td className="px-3 py-3 text-right tabular-nums">{user.tasksCreated}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHours(user.hoursTracked)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHours(user.avgDailyHours)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHours(user.avgMonthlyHours)}</td>
              <td className="px-3 py-3 tabular-nums text-muted-foreground">
                {formatDateTime(user.lastActivity)}
              </td>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-[0.625em] uppercase tracking-[0.12em]",
                    user.hasActiveSession ? "text-billable" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      user.hasActiveSession ? "bg-billable" : "bg-muted-foreground/40",
                    )}
                  />
                  {user.hasActiveSession ? "Attiva" : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

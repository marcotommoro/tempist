import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import type { PlatformOverview } from "@/lib/domain/platform-admin";

function formatHours(hours: number): string {
  return hours.toFixed(1);
}

export function AdminStatGrid({ overview }: { overview: PlatformOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="flex divide-x divide-border">
        <Stat label="Utenti totali" value={overview.totalUsers} />
        <Stat
          label="Nuovi 7g"
          value={overview.signupsLast7d}
          sub={`${overview.signupsLast30d} negli ultimi 30g`}
        />
      </Card>
      <Card className="flex divide-x divide-border">
        <Stat label="Workspace" value={overview.totalWorkspaces} />
        <Stat label="Task creati" value={overview.totalTasks} />
      </Card>
      <Card className="flex divide-x divide-border">
        <Stat label="DAU" value={overview.activeUsers.dau} sub="ultime 24h" />
        <Stat label="WAU" value={overview.activeUsers.wau} sub="ultimi 7g" />
        <Stat label="MAU" value={overview.activeUsers.mau} sub="ultimi 30g" />
      </Card>
      <Card className="flex divide-x divide-border">
        <Stat
          label="Ore tracciate"
          value={formatHours(overview.totalHoursTracked)}
          accent="billable"
        />
        <Stat
          label="Media giornaliera"
          value={formatHours(overview.avgUsage.dailyHours)}
          sub="piattaforma, ultimi 30g"
        />
      </Card>
      <Card className="flex divide-x divide-border md:col-span-2">
        <Stat
          label="Media mensile"
          value={formatHours(overview.avgUsage.monthlyHours)}
          sub="ore totali ultimi 30g"
        />
        <Stat
          label="Media annuale"
          value={formatHours(overview.avgUsage.yearlyHours)}
          sub="ore totali ultimi 365g"
        />
      </Card>
    </div>
  );
}

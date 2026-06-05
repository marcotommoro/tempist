import { AdminStatGrid } from "@/components/features/platform-admin/admin-stat-grid";
import { SignupsChart } from "@/components/features/platform-admin/signups-chart";
import { PageHeader } from "@/components/features/page-header/page-header";
import { Card } from "@/components/ui/card";
import { getPlatformOverview } from "@/lib/domain/platform-admin";
import { fillDailyGaps } from "@/lib/utils/report-range";

function mergeChartData(
  signupsByDay: { day: string; count: number }[],
  activityByDay: { day: string; activeUsers: number }[],
) {
  const activityMap = new Map(activityByDay.map((row) => [row.day, row.activeUsers]));
  const signupMap = new Map(signupsByDay.map((row) => [row.day, row.count]));
  const days = new Set([...activityMap.keys(), ...signupMap.keys()]);
  const sortedDays = [...days].sort();

  if (sortedDays.length === 0) return [];

  const sparse = sortedDays.map((day) => ({
    day,
    signups: signupMap.get(day) ?? 0,
    activeUsers: activityMap.get(day) ?? 0,
  }));
  const from = new Date(`${sortedDays[0]}T00:00:00`);
  const to = new Date(`${sortedDays[sortedDays.length - 1]}T00:00:00`);
  const filled = fillDailyGaps(sparse, from, to, (day) => ({
    day,
    signups: 0,
    activeUsers: 0,
  }));

  return filled;
}

export default async function AdminOverviewPage() {
  const overview = await getPlatformOverview();
  const chartData = mergeChartData(overview.signupsByDay, overview.activityByDay);

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        emphasis="metriche"
        description="Panoramica cross-tenant di iscrizioni, utilizzo e attività."
      />
      <div className="space-y-6">
        <AdminStatGrid overview={overview} />
        <Card className="p-5">
          <div className="mb-4 space-y-1">
            <h2 className="font-mono text-[0.6875em] uppercase tracking-[0.14em] text-muted-foreground">
              Ultimi 30 giorni
            </h2>
            <p className="text-sm text-muted-foreground">
              Iscrizioni giornaliere e utenti attivi (task, time entry, sessione).
            </p>
          </div>
          <SignupsChart data={chartData} />
        </Card>
      </div>
    </div>
  );
}

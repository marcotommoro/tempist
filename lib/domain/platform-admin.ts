import { and, eq, gte, ilike, isNull, lt, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MS_PER_DAY);
}

function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

async function countActiveUsers(since: Date): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT active_users.user_id)::int`,
    })
    .from(
      sql`(
        SELECT ${schema.task.createdById} AS user_id
        FROM ${schema.task}
        WHERE ${schema.task.deletedAt} IS NULL
          AND (${schema.task.createdAt} >= ${since} OR ${schema.task.updatedAt} >= ${since})
        UNION
        SELECT ${schema.timeEntry.userId} AS user_id
        FROM ${schema.timeEntry}
        WHERE ${schema.timeEntry.startedAt} >= ${since}
        UNION
        SELECT ${schema.session.userId} AS user_id
        FROM ${schema.session}
        WHERE ${schema.session.updatedAt} >= ${since}
      ) AS active_users`,
    );

  return Number(row?.count ?? 0);
}

async function sumTrackedSeconds(opts: { from?: Date; to?: Date } = {}): Promise<number> {
  const conds = [eq(schema.timeEntry.isRunning, false)];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));

  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
    })
    .from(schema.timeEntry)
    .where(and(...conds));

  return Number(row?.total ?? 0);
}

export type PlatformOverview = {
  totalUsers: number;
  totalWorkspaces: number;
  signupsLast7d: number;
  signupsLast30d: number;
  totalTasks: number;
  totalHoursTracked: number;
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
  };
  avgUsage: {
    dailyHours: number;
    monthlyHours: number;
    yearlyHours: number;
  };
  signupsByDay: { day: string; count: number }[];
  activityByDay: { day: string; activeUsers: number }[];
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const now = new Date();
  const last7d = daysAgo(7);
  const last30d = daysAgo(30);
  const last365d = daysAgo(365);

  const [
    usersCount,
    workspacesCount,
    signups7d,
    signups30d,
    tasksCount,
    dau,
    wau,
    mau,
    totalSeconds,
    secondsLast30d,
    secondsLast365d,
    signupsByDay,
    activityByDay,
  ] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.user),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.organization),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.user)
      .where(gte(schema.user.createdAt, last7d)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.user)
      .where(gte(schema.user.createdAt, last30d)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.task)
      .where(isNull(schema.task.deletedAt)),
    countActiveUsers(daysAgo(1)),
    countActiveUsers(last7d),
    countActiveUsers(last30d),
    sumTrackedSeconds(),
    sumTrackedSeconds({ from: last30d, to: now }),
    sumTrackedSeconds({ from: last365d, to: now }),
    db
      .select({
        day: sql<string>`TO_CHAR(${schema.user.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.user)
      .where(gte(schema.user.createdAt, last30d))
      .groupBy(sql`TO_CHAR(${schema.user.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`1 ASC`),
    db
      .select({
        day: sql<string>`TO_CHAR(activity_at, 'YYYY-MM-DD')`,
        activeUsers: sql<number>`COUNT(DISTINCT user_id)::int`,
      })
      .from(
        sql`(
          SELECT ${schema.task.createdById} AS user_id, ${schema.task.createdAt} AS activity_at
          FROM ${schema.task}
          WHERE ${schema.task.deletedAt} IS NULL AND ${schema.task.createdAt} >= ${last30d}
          UNION ALL
          SELECT ${schema.task.createdById} AS user_id, ${schema.task.updatedAt} AS activity_at
          FROM ${schema.task}
          WHERE ${schema.task.deletedAt} IS NULL AND ${schema.task.updatedAt} >= ${last30d}
          UNION ALL
          SELECT ${schema.timeEntry.userId} AS user_id, ${schema.timeEntry.startedAt} AS activity_at
          FROM ${schema.timeEntry}
          WHERE ${schema.timeEntry.startedAt} >= ${last30d}
          UNION ALL
          SELECT ${schema.session.userId} AS user_id, ${schema.session.updatedAt} AS activity_at
          FROM ${schema.session}
          WHERE ${schema.session.updatedAt} >= ${last30d}
        ) AS activity_events`,
      )
      .groupBy(sql`TO_CHAR(activity_at, 'YYYY-MM-DD')`)
      .orderBy(sql`1 ASC`),
  ]);

  const totalUsers = Number(usersCount[0]?.count ?? 0);
  const totalSecondsAll = totalSeconds;

  return {
    totalUsers,
    totalWorkspaces: Number(workspacesCount[0]?.count ?? 0),
    signupsLast7d: Number(signups7d[0]?.count ?? 0),
    signupsLast30d: Number(signups30d[0]?.count ?? 0),
    totalTasks: Number(tasksCount[0]?.count ?? 0),
    totalHoursTracked: secondsToHours(totalSecondsAll),
    activeUsers: { dau, wau, mau },
    avgUsage: {
      dailyHours: secondsToHours(secondsLast30d) / 30,
      monthlyHours: secondsToHours(secondsLast30d),
      yearlyHours: secondsToHours(secondsLast365d),
    },
    signupsByDay: signupsByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    activityByDay: activityByDay.map((r) => ({
      day: r.day,
      activeUsers: Number(r.activeUsers),
    })),
  };
}

export type UserWithMetrics = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  banned: boolean;
  createdAt: Date;
  workspaceCount: number;
  tasksCreated: number;
  hoursTracked: number;
  hoursLast30d: number;
  avgDailyHours: number;
  avgMonthlyHours: number;
  avgYearlyHours: number;
  lastActivity: Date | null;
  hasActiveSession: boolean;
};

export async function listUsersWithMetrics(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: UserWithMetrics[]; total: number }> {
  const search = opts?.search?.trim();
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;
  const last30d = daysAgo(30);
  const last365d = daysAgo(365);
  const now = new Date();

  const whereClause = search
    ? or(ilike(schema.user.email, `%${search}%`), ilike(schema.user.name, `%${search}%`))
    : undefined;

  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.user)
    .where(whereClause);

  const rows = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      role: schema.user.role,
      banned: schema.user.banned,
      createdAt: schema.user.createdAt,
      workspaceCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.member}
        WHERE ${schema.member.userId} = ${schema.user.id}
      )`,
      tasksCreated: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.task}
        WHERE ${schema.task.createdById} = ${schema.user.id}
          AND ${schema.task.deletedAt} IS NULL
      )`,
      totalSeconds: sql<number>`COALESCE((
        SELECT SUM(${schema.timeEntry.durationSeconds})::int FROM ${schema.timeEntry}
        WHERE ${schema.timeEntry.userId} = ${schema.user.id}
          AND ${schema.timeEntry.isRunning} = false
      ), 0)`,
      secondsLast30d: sql<number>`COALESCE((
        SELECT SUM(${schema.timeEntry.durationSeconds})::int FROM ${schema.timeEntry}
        WHERE ${schema.timeEntry.userId} = ${schema.user.id}
          AND ${schema.timeEntry.isRunning} = false
          AND ${schema.timeEntry.startedAt} >= ${last30d}
      ), 0)`,
      secondsLast365d: sql<number>`COALESCE((
        SELECT SUM(${schema.timeEntry.durationSeconds})::int FROM ${schema.timeEntry}
        WHERE ${schema.timeEntry.userId} = ${schema.user.id}
          AND ${schema.timeEntry.isRunning} = false
          AND ${schema.timeEntry.startedAt} >= ${last365d}
      ), 0)`,
      lastActivity: sql<Date | null>`GREATEST(
        (SELECT MAX(${schema.task.updatedAt}) FROM ${schema.task}
          WHERE ${schema.task.createdById} = ${schema.user.id}),
        (SELECT MAX(${schema.timeEntry.startedAt}) FROM ${schema.timeEntry}
          WHERE ${schema.timeEntry.userId} = ${schema.user.id}),
        (SELECT MAX(${schema.session.updatedAt}) FROM ${schema.session}
          WHERE ${schema.session.userId} = ${schema.user.id})
      )`,
      hasActiveSession: sql<boolean>`EXISTS (
        SELECT 1 FROM ${schema.session}
        WHERE ${schema.session.userId} = ${schema.user.id}
          AND ${schema.session.expiresAt} > ${now}
      )`,
    })
    .from(schema.user)
    .where(whereClause)
    .orderBy(sql`${schema.user.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const users: UserWithMetrics[] = rows.map((row) => {
    const secondsLast30d = Number(row.secondsLast30d);
    const secondsLast365d = Number(row.secondsLast365d);
    const totalSeconds = Number(row.totalSeconds);

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      banned: row.banned,
      createdAt: row.createdAt,
      workspaceCount: Number(row.workspaceCount),
      tasksCreated: Number(row.tasksCreated),
      hoursTracked: secondsToHours(totalSeconds),
      hoursLast30d: secondsToHours(secondsLast30d),
      avgDailyHours: secondsToHours(secondsLast30d) / 30,
      avgMonthlyHours: secondsToHours(secondsLast30d),
      avgYearlyHours: secondsToHours(secondsLast365d) / 365,
      lastActivity: row.lastActivity,
      hasActiveSession: Boolean(row.hasActiveSession),
    };
  });

  return { users, total: Number(totalRow?.count ?? 0) };
}

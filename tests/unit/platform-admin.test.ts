import { describe, expect, it } from "vitest";

import { getPlatformRole } from "@/lib/auth/platform-role";

describe("getPlatformRole", () => {
  it("returns admin when role is admin", () => {
    expect(getPlatformRole({ role: "admin" })).toBe("admin");
  });

  it("returns user for missing or other roles", () => {
    expect(getPlatformRole({})).toBe("user");
    expect(getPlatformRole({ role: "user" })).toBe("user");
    expect(getPlatformRole({ role: "owner" })).toBe("user");
    expect(getPlatformRole({ role: null })).toBe("user");
  });
});

describe("platform-admin domain (db)", () => {
  it("loads overview and user metrics when DATABASE_URL is configured", async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const { getPlatformOverview, listUsersWithMetrics } = await import(
      "@/lib/domain/platform-admin"
    );

    const overview = await getPlatformOverview();
    expect(overview.totalUsers).toBeGreaterThanOrEqual(0);
    expect(overview.activeUsers.dau).toBeLessThanOrEqual(overview.activeUsers.wau);
    expect(overview.activeUsers.wau).toBeLessThanOrEqual(overview.activeUsers.mau);
    expect(overview.avgUsage.dailyHours).toBeGreaterThanOrEqual(0);

    const { users, total } = await listUsersWithMetrics({ limit: 10 });
    expect(total).toBeGreaterThanOrEqual(users.length);
    for (const user of users) {
      expect(user.email).toContain("@");
      expect(user.avgDailyHours).toBe(user.avgMonthlyHours / 30);
      expect(user.workspaceCount).toBeGreaterThanOrEqual(0);
      expect(user.tasksCreated).toBeGreaterThanOrEqual(0);
    }
  });
});

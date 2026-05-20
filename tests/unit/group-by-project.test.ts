import { describe, it, expect } from "vitest";

import {
  groupByProject,
  parseTaskGroupMode,
} from "@/lib/utils/group-by-project";

type MiniTask = { id: string; projectId: string | null };

const projects = [
  { id: "p-beta", name: "Beta", color: "#111111", isFavorite: false },
  { id: "p-alpha", name: "Alpha", color: "#222222", isFavorite: true },
  { id: "p-gamma", name: "Gamma", color: "#333333", isFavorite: false },
] as const;

describe("parseTaskGroupMode", () => {
  it("defaults to flat", () => {
    expect(parseTaskGroupMode(undefined)).toBe("flat");
    expect(parseTaskGroupMode("flat")).toBe("flat");
    expect(parseTaskGroupMode("other")).toBe("flat");
  });

  it("parses project mode", () => {
    expect(parseTaskGroupMode("project")).toBe("project");
  });
});

describe("groupByProject", () => {
  it("orders favorites before non-favorites, then alphabetically", () => {
    const tasks: MiniTask[] = [
      { id: "t1", projectId: "p-beta" },
      { id: "t2", projectId: "p-gamma" },
      { id: "t3", projectId: "p-alpha" },
    ];
    const groups = groupByProject(tasks, projects);
    expect(groups.map((g) => g.projectId)).toEqual(["p-alpha", "p-beta", "p-gamma"]);
  });

  it("puts unassigned tasks in Senza progetto bucket last", () => {
    const tasks: MiniTask[] = [
      { id: "t1", projectId: null },
      { id: "t2", projectId: "p-beta" },
    ];
    const groups = groupByProject(tasks, projects);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.projectId).toBe("p-beta");
    expect(groups[1]?.projectId).toBeNull();
    expect(groups[1]?.meta?.name).toBe("Senza progetto");
  });

  it("omits empty project groups", () => {
    const tasks: MiniTask[] = [{ id: "t1", projectId: "p-alpha" }];
    const groups = groupByProject(tasks, projects);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.projectId).toBe("p-alpha");
  });

  it("handles orphan project ids not in project list", () => {
    const tasks: MiniTask[] = [{ id: "t1", projectId: "p-unknown" }];
    const groups = groupByProject(tasks, projects);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.projectId).toBe("p-unknown");
    expect(groups[0]?.meta?.name).toBe("Progetto");
  });
});

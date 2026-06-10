import { describe, expect, it } from "vitest";

import { buildClientByTask } from "@/lib/utils/client-by-task";

const clients = [
  { id: "c1", name: "Acme", color: "#ff0000" },
  { id: "c2", name: "Globex", color: "#00ff00" },
];
const projects = [
  { id: "p1", clientId: "c2" },
  { id: "p2", clientId: null },
];

describe("buildClientByTask", () => {
  it("usa il cliente diretto del task quando presente", () => {
    const map = buildClientByTask(
      [{ id: "t1", clientId: "c1", projectId: "p1" }],
      projects,
      clients,
    );
    expect(map.get("t1")).toEqual({ name: "Acme", color: "#ff0000" });
  });

  it("fa fallback sul cliente del progetto", () => {
    const map = buildClientByTask(
      [{ id: "t1", clientId: null, projectId: "p1" }],
      projects,
      clients,
    );
    expect(map.get("t1")).toEqual({ name: "Globex", color: "#00ff00" });
  });

  it("omette i task senza cliente (diretto o via progetto)", () => {
    const map = buildClientByTask(
      [
        { id: "t1", clientId: null, projectId: "p2" },
        { id: "t2", clientId: null, projectId: null },
      ],
      projects,
      clients,
    );
    expect(map.size).toBe(0);
  });

  it("omette i task il cui cliente non è nella lista (es. archiviato)", () => {
    const map = buildClientByTask(
      [{ id: "t1", clientId: "ghost", projectId: null }],
      projects,
      clients,
    );
    expect(map.size).toBe(0);
  });
});

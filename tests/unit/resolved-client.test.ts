import { describe, expect, it } from "vitest";

import { belongsToClient, resolvedClientId } from "@/lib/utils/resolved-client";

describe("resolvedClientId", () => {
  it("usa il cliente del progetto quando presente", () => {
    expect(
      resolvedClientId({
        directClientId: "direct",
        projectClientId: "project",
      }),
    ).toBe("project");
  });

  it("fa fallback sul cliente diretto se il progetto non ha cliente", () => {
    expect(
      resolvedClientId({
        directClientId: "direct",
        projectClientId: null,
      }),
    ).toBe("direct");
  });

  it("restituisce null se né progetto né voce hanno un cliente", () => {
    expect(
      resolvedClientId({
        directClientId: null,
        projectClientId: null,
      }),
    ).toBeNull();
  });
});

describe("belongsToClient", () => {
  it("include il lavoro storico di un progetto associato anche senza clientId diretto", () => {
    expect(
      belongsToClient({
        clientId: "acme",
        directClientId: null,
        projectClientId: "acme",
      }),
    ).toBe(true);
  });

  it("include le voci dirette senza progetto", () => {
    expect(
      belongsToClient({
        clientId: "acme",
        directClientId: "acme",
        projectClientId: null,
      }),
    ).toBe(true);
  });

  it("non attribuisce al cliente A il lavoro di un progetto del cliente B", () => {
    expect(
      belongsToClient({
        clientId: "acme",
        directClientId: "acme",
        projectClientId: "globex",
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  findFreeTextMatch,
  matchByName,
  normalizeName,
  stripFreeTextMatch,
} from "@/lib/utils/fuzzy-match";

describe("normalizeName", () => {
  it("splitta su spazi e punteggiatura, lowercase", () => {
    const tokens = normalizeName("Matteo Bassoli");
    expect(tokens.has("matteo")).toBe(true);
    expect(tokens.has("bassoli")).toBe(true);
  });

  it("strippa diacritici", () => {
    const tokens = normalizeName("Caffè & Co.");
    expect(tokens.has("caffe")).toBe(true);
    expect(tokens.has("co")).toBe(true);
  });

  it("collassa run di token corti in acronimo (A.L.I.Ce. → alice)", () => {
    const tokens = normalizeName("A.L.I.Ce. Italia");
    expect(tokens.has("alice")).toBe(true);
    expect(tokens.has("italia")).toBe(true);
  });

  it("supporta acronimo classico (I.B.M. → ibm)", () => {
    const tokens = normalizeName("I.B.M. Italia");
    expect(tokens.has("ibm")).toBe(true);
  });

  it("ritorna set vuoto su stringa senza alfanumerici", () => {
    expect(normalizeName("---").size).toBe(0);
    expect(normalizeName("").size).toBe(0);
  });
});

describe("matchByName (token mode)", () => {
  const clients = [
    { id: "c1", name: "Matteo Bassoli" },
    { id: "c2", name: "A.L.I.Ce. Italia" },
    { id: "c3", name: "Marco Rossi" },
  ];

  it("matcha 'bassoli' → Matteo Bassoli", () => {
    expect(matchByName("bassoli", clients)?.id).toBe("c1");
  });

  it("matcha 'matteo' → Matteo Bassoli", () => {
    expect(matchByName("matteo", clients)?.id).toBe("c1");
  });

  it("matcha 'alice' → A.L.I.Ce. Italia (acronimo collassato)", () => {
    expect(matchByName("alice", clients)?.id).toBe("c2");
  });

  it("non matcha prefissi parziali ('mat' → null)", () => {
    expect(matchByName("mat", clients)).toBeNull();
  });

  it("ritorna null in caso di ambiguità", () => {
    const dupes = [
      { id: "a", name: "Marco Rossi" },
      { id: "b", name: "Marco Bianchi" },
    ];
    expect(matchByName("marco", dupes)).toBeNull();
  });

  it("ritorna null se nessun match", () => {
    expect(matchByName("inesistente", clients)).toBeNull();
  });

  it("non applica filtri di min-length (token espliciti)", () => {
    const items = [{ id: "x", name: "Al" }];
    expect(matchByName("al", items)?.id).toBe("x");
  });

  it("query multi-parola richiede tutte le parole presenti", () => {
    const items = [
      { id: "a", name: "Marco Rossi" },
      { id: "b", name: "Marco Bianchi" },
    ];
    expect(matchByName("marco rossi", items)?.id).toBe("a");
  });
});

describe("findFreeTextMatch (free-text mode)", () => {
  const clients = [
    { id: "c1", name: "Matteo Bassoli" },
    { id: "c2", name: "A.L.I.Ce. Italia" },
  ];

  it("trova match dentro testo libero", () => {
    const res = findFreeTextMatch("chiama bassoli per preventivo", clients);
    expect(res?.item.id).toBe("c1");
    expect(res?.matchedTokens.has("bassoli")).toBe(true);
  });

  it("trova match acronimo dentro testo libero", () => {
    const res = findFreeTextMatch("call alice tomorrow", clients);
    expect(res?.item.id).toBe("c2");
    expect(res?.matchedTokens.has("alice")).toBe(true);
  });

  it("non matcha parole troppo corte ('mat' < 3 char)", () => {
    expect(findFreeTextMatch("mat domani", clients)).toBeNull();
  });

  it("silent skip su ambiguità (no errore)", () => {
    const dupes = [
      { id: "a", name: "Marco Rossi" },
      { id: "b", name: "Marco Bianchi" },
    ];
    expect(findFreeTextMatch("riunione con marco", dupes)).toBeNull();
  });

  it("ritorna null se nessun match", () => {
    expect(findFreeTextMatch("comprare il latte", clients)).toBeNull();
  });

  it("ignora stopword anche se presenti nel nome di un cliente", () => {
    // Cliente che si chiama come una stopword: non deve mai matchare via free-text.
    const items = [{ id: "x", name: "Per" }];
    expect(findFreeTextMatch("preparare per riunione", items)).toBeNull();
  });

  it("ignora token di un singolo carattere nei nomi (no match su 'a' nel titolo)", () => {
    // "A.L.I.Ce." produrrebbe i token a/l/i/ce; ma sotto min-length devono essere
    // filtrati così "a" non triggera su un titolo qualsiasi.
    const items = [{ id: "x", name: "A.L.I.Ce. Italia" }];
    expect(findFreeTextMatch("aspetta a fare cose", items)).toBeNull();
  });
});

describe("stripFreeTextMatch", () => {
  it("rimuove la parola matchata mantenendo il resto", () => {
    expect(
      stripFreeTextMatch("alice 7 giugno mandare la mail", new Set(["alice"])),
    ).toBe("7 giugno mandare la mail");
  });

  it("rimuove forma con maiuscole/diacritici", () => {
    expect(stripFreeTextMatch("Caffè domani", new Set(["caffe"]))).toBe("domani");
  });

  it("rimuove acronimo dotted ('A.L.I.Ce.' → token alice)", () => {
    expect(
      stripFreeTextMatch("A.L.I.Ce. preparare bozza", new Set(["alice"])),
    ).toBe("preparare bozza");
  });

  it("collassa spazi multipli", () => {
    expect(stripFreeTextMatch("chiama  bassoli  oggi", new Set(["bassoli"]))).toBe(
      "chiama oggi",
    );
  });

  it("non rimuove parole non interamente matchate", () => {
    // "alice's" → norm = {alice, s} → filtered {alice} → tutti in set → strip ok.
    // Ma una parola tipo "alicemio" (concatenata) → norm = {alicemio} → non in set → keep.
    expect(stripFreeTextMatch("alicemio task", new Set(["alice"]))).toBe(
      "alicemio task",
    );
  });

  it("no-op se matchedTokens vuoto", () => {
    expect(stripFreeTextMatch("alice domani", new Set())).toBe("alice domani");
  });
});

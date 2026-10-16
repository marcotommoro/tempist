import { describe, expect, it } from "vitest";

import { addDaysIso, addOneYear, feeStatus, todayIso } from "@/lib/utils/annual-fee";

describe("addOneYear", () => {
  it("sposta di un anno lo stesso giorno", () => {
    expect(addOneYear("2026-03-15")).toBe("2027-03-15");
  });
  it("29 febbraio → 28 febbraio dell'anno dopo", () => {
    expect(addOneYear("2028-02-29")).toBe("2029-02-28");
  });
  it("31 dicembre resta 31 dicembre", () => {
    expect(addOneYear("2026-12-31")).toBe("2027-12-31");
  });
});

describe("addDaysIso", () => {
  it("attraversa il cambio d'ora e il cambio d'anno", () => {
    expect(addDaysIso("2026-10-20", 30)).toBe("2026-11-19");
    expect(addDaysIso("2026-12-20", 30)).toBe("2027-01-19");
  });
});

describe("todayIso", () => {
  it("usa la timezone dell'utente, non UTC", () => {
    // 23:30 UTC del 16 ottobre = 01:30 del 17 a Roma
    expect(todayIso("Europe/Rome", new Date("2026-10-16T23:30:00Z"))).toBe("2026-10-17");
  });
});

describe("feeStatus", () => {
  const today = "2026-10-16";
  it("scadenza passata → overdue", () => {
    expect(feeStatus("2026-09-01", today)).toBe("overdue");
  });
  it("scadenza tra 10 giorni → due_soon", () => {
    expect(feeStatus("2026-10-26", today)).toBe("due_soon");
  });
  it("il giorno della scadenza è ancora due_soon, il giorno dopo overdue", () => {
    expect(feeStatus(today, today)).toBe("due_soon");
    expect(feeStatus("2026-10-15", today)).toBe("overdue");
  });
  it("il 30° giorno è dentro la finestra, il 31° fuori", () => {
    expect(feeStatus("2026-11-15", today)).toBe("due_soon");
    expect(feeStatus("2026-11-16", today)).toBe("ok");
  });
  it("scadenza tra 60 giorni → ok", () => {
    expect(feeStatus("2026-12-15", today)).toBe("ok");
  });
});

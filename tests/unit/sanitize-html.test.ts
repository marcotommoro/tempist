import { describe, expect, it } from "vitest";

import {
  htmlToText,
  normalizeDescriptionHtml,
  sanitizeHtml,
} from "@/lib/utils/html";

describe("sanitizeHtml", () => {
  it("preserva i tag prodotti dall'editor, incluso <hr>", () => {
    const html =
      "<p>Prima</p><hr><p><strong>Dopo</strong> <em>il</em> divisore</p>";
    const clean = sanitizeHtml(html);
    expect(clean).toContain("<hr>");
    expect(clean).toContain("<strong>Dopo</strong>");
  });

  it("rimuove script e handler inline", () => {
    const clean = sanitizeHtml(
      '<p onclick="alert(1)">ciao</p><script>alert(1)</script>',
    );
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
  });

  it("blocca i protocolli pericolosi nei link", () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(clean).not.toContain("javascript:");
  });
});

describe("normalizeDescriptionHtml", () => {
  it("mantiene <hr> quando c'è testo visibile (round-trip del divisore `---`)", () => {
    const result = normalizeDescriptionHtml("<p>testo</p><hr>");
    expect(result).toContain("<hr>");
  });

  it("ritorna null per un editor vuoto", () => {
    expect(normalizeDescriptionHtml("<p></p>")).toBeNull();
  });

  // Scelta deliberata: un solo <hr> senza testo non è una descrizione utile.
  it("ritorna null per un solo <hr> senza testo visibile", () => {
    expect(normalizeDescriptionHtml("<hr>")).toBeNull();
  });
});

describe("htmlToText", () => {
  it("converte i blocchi in a-capo", () => {
    expect(htmlToText("<p>uno</p><p>due</p>")).toBe("uno\ndue");
  });
});

import { describe, it, expect } from "vitest";
import {
  toggleTaskListItem,
  countTaskListItems,
} from "@/lib/utils/markdown-tasklist";

describe("countTaskListItems", () => {
  it("counts unordered task-list items, ignoring plain bullets", () => {
    const md = ["- [ ] uno", "- normale", "- [x] due"].join("\n");
    expect(countTaskListItems(md)).toBe(2);
  });

  it("counts ordered markers (1. and 1)) as task-list items", () => {
    const md = ["1. [ ] uno", "2) [x] due"].join("\n");
    expect(countTaskListItems(md)).toBe(2);
  });

  it("returns 0 when there are no task-list items", () => {
    expect(countTaskListItems("solo testo\n- bullet\n1. ordinato")).toBe(0);
  });

  it("does not count an inline [ ] that is not a list marker", () => {
    const md = "Questo [ ] non è una checkbox\n- [ ] questa sì";
    expect(countTaskListItems(md)).toBe(1);
  });
});

describe("toggleTaskListItem", () => {
  it("checks an unchecked box", () => {
    expect(toggleTaskListItem("- [ ] uno", 0)).toBe("- [x] uno");
  });

  it("unchecks a checked box", () => {
    expect(toggleTaskListItem("- [x] uno", 0)).toBe("- [ ] uno");
  });

  it("treats [X] (uppercase) as checked and unchecks it", () => {
    expect(toggleTaskListItem("- [X] uno", 0)).toBe("- [ ] uno");
  });

  it("toggles only the targeted item, leaving others intact", () => {
    const md = ["- [ ] uno", "- [ ] due", "- [ ] tre"].join("\n");
    const expected = ["- [ ] uno", "- [x] due", "- [ ] tre"].join("\n");
    expect(toggleTaskListItem(md, 1)).toBe(expected);
  });

  it("preserves the text after the checkbox", () => {
    expect(toggleTaskListItem("- [ ] Comprare il latte", 0)).toBe(
      "- [x] Comprare il latte",
    );
  });

  it("preserves marker style and indentation", () => {
    expect(toggleTaskListItem("  * [ ] indentato", 0)).toBe("  * [x] indentato");
    expect(toggleTaskListItem("3) [ ] ordinato", 0)).toBe("3) [x] ordinato");
  });

  it("ignores plain list items when indexing (index counts task items only)", () => {
    const md = ["- normale", "- [ ] vera", "- altra normale"].join("\n");
    const expected = ["- normale", "- [x] vera", "- altra normale"].join("\n");
    expect(toggleTaskListItem(md, 0)).toBe(expected);
  });

  it("indexes nested/indented task items in document (top-to-bottom) order", () => {
    const md = ["- [ ] padre", "  - [ ] figlio", "- [ ] zio"].join("\n");
    const expected = ["- [ ] padre", "  - [x] figlio", "- [ ] zio"].join("\n");
    expect(toggleTaskListItem(md, 1)).toBe(expected);
  });

  it("returns the input unchanged for out-of-range indexes", () => {
    const md = "- [ ] uno";
    expect(toggleTaskListItem(md, 5)).toBe(md);
    expect(toggleTaskListItem(md, -1)).toBe(md);
  });

  it("is idempotent: toggling the same index twice restores the original", () => {
    const md = ["- [ ] uno", "- [x] due"].join("\n");
    expect(toggleTaskListItem(toggleTaskListItem(md, 0), 0)).toBe(md);
    expect(toggleTaskListItem(toggleTaskListItem(md, 1), 1)).toBe(md);
  });
});

import { describe, expect, it, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

import { listTabGuard } from "@/components/features/tasks/description-editor";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function makeEditor(content: string) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      listTabGuard,
    ],
    content,
  });
}

/** Simula il Tab reale sull'area editabile e dice se il browser lo userebbe. */
function pressTab(e: Editor, shift = false): { defaultPrevented: boolean } {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    code: "Tab",
    keyCode: 9,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  e.view.dom.dispatchEvent(event);
  return { defaultPrevented: event.defaultPrevented };
}

describe("listTabGuard", () => {
  it("annida la voce quando c'è una sorella precedente", () => {
    editor = makeEditor("<ul><li><p>uno</p></li><li><p>due</p></li></ul>");
    // cursore dentro "due" (seconda voce)
    editor.commands.focus("end");

    expect(pressTab(editor).defaultPrevented).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>uno</p><ul>");
  });

  it("trattiene il Tab sulla prima voce, dove annidare non è possibile", () => {
    editor = makeEditor("<ul><li><p>uno</p></li></ul>");
    editor.commands.focus("end");

    const before = editor.getHTML();
    // Senza guard qui il focus scapperebbe sul bottone successivo.
    expect(pressTab(editor).defaultPrevented).toBe(true);
    expect(editor.getHTML()).toBe(before);
  });

  it("trattiene il Tab anche nelle checklist", () => {
    editor = makeEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>uno</p></li></ul>',
    );
    editor.commands.focus("end");

    expect(pressTab(editor).defaultPrevented).toBe(true);
  });

  it("lascia uscire il Tab fuori dalle liste (accessibilità)", () => {
    editor = makeEditor("<p>testo normale</p>");
    editor.commands.focus("end");

    expect(pressTab(editor).defaultPrevented).toBe(false);
  });
});

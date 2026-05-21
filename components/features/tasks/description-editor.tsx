"use client";

import { useEffect, type KeyboardEvent } from "react";
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Strikethrough,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/utils/html";

const sharedProse = cn(
  "prose prose-sm max-w-none dark:prose-invert",
  "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2",
  "[&_li[data-type=taskItem]>label]:mt-1 [&_li[data-type=taskItem]>label]:select-none",
  "[&_input[type=checkbox]]:accent-coral [&_input[type=checkbox]]:cursor-pointer",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs",
  "[&_a]:text-primary [&_a]:underline",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
);

const readonlyExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

/**
 * Editor rich-text WYSIWYG (TipTap / ProseMirror). Emette HTML semantico via
 * `onChange`; il valore HTML viene sanitizzato lato server prima di persistere
 * (vedi lib/utils/html.ts). Sostituisce il vecchio editor markdown.
 *
 * `immediatelyRender: false` è obbligatorio sotto Next.js: evita il mismatch di
 * hydration perché TipTap non renderizza durante l'SSR del client component.
 */
export function DescriptionEditor({
  value,
  onChange,
  placeholder = "Aggiungi una descrizione…",
  disabled = false,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(sharedProse, "focus:outline-none min-h-[6rem] px-3 py-2"),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sincronizza quando il `value` cambia dall'esterno (es. reset dopo il salva).
  // Evitiamo il loop: scriviamo solo se diverge dall'HTML corrente e senza
  // emettere un update (che ritriggererebbe onChange).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    const bothEmpty = incoming === "" && current === "<p></p>";
    if (incoming !== current && !bothEmpty) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-md border border-input bg-background transition-colors focus-within:border-coral/40 focus-within:ring-2 focus-within:ring-ring/30",
        disabled && "opacity-60",
      )}
    >
      <Toolbar editor={editor} disabled={disabled} />
      <div className="relative">
        {editor?.isEmpty && (
          <p
            aria-hidden
            className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground"
          >
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} className="text-sm" />
      </div>
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  // useEditorState ri-renderizza la toolbar solo quando cambiano i flag attivi,
  // non a ogni transazione: stati dei bottoni sempre coerenti con la selezione.
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            strike: editor.isActive("strike"),
            code: editor.isActive("code"),
            h2: editor.isActive("heading", { level: 2 }),
            h3: editor.isActive("heading", { level: 3 }),
            bulletList: editor.isActive("bulletList"),
            orderedList: editor.isActive("orderedList"),
            taskList: editor.isActive("taskList"),
            blockquote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
          }
        : null,
  });

  if (!editor) return null;

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
      <Btn label="Grassetto" active={state?.bold} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-3.5" />
      </Btn>
      <Btn label="Corsivo" active={state?.italic} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-3.5" />
      </Btn>
      <Btn label="Barrato" active={state?.strike} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-3.5" />
      </Btn>
      <Btn label="Codice" active={state?.code} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-3.5" />
      </Btn>
      <Divider />
      <Btn label="Titolo 2" active={state?.h2} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-3.5" />
      </Btn>
      <Btn label="Titolo 3" active={state?.h3} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-3.5" />
      </Btn>
      <Divider />
      <Btn label="Elenco puntato" active={state?.bulletList} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-3.5" />
      </Btn>
      <Btn label="Elenco numerato" active={state?.orderedList} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-3.5" />
      </Btn>
      <Btn label="Checklist" active={state?.taskList} disabled={disabled} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListTodo className="size-3.5" />
      </Btn>
      <Divider />
      <Btn label="Citazione" active={state?.blockquote} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-3.5" />
      </Btn>
      <Btn label="Link" active={state?.link} disabled={disabled} onClick={setLink}>
        <Link2 className="size-3.5" />
      </Btn>
    </div>
  );
}

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // onMouseDown preventDefault: non perdere la selezione del testo al click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-border/60" />;
}

/**
 * Renderer di sola lettura per l'HTML salvato. Usa una istanza TipTap non
 * editabile invece dell'iniezione diretta di HTML nel DOM: ProseMirror parsa
 * l'HTML nel proprio schema scartando nodi/attributi non previsti, quindi non
 * c'è superficie di injection. Sanitizziamo comunque l'input per difesa in
 * profondità. `pointer-events-none` fa sì che ogni click arrivi al contenitore
 * (che apre l'editor), invece di interagire con checkbox o link.
 */
export function RichTextContent({ html }: { html: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: readonlyExtensions,
    content: sanitizeHtml(html),
    editorProps: {
      attributes: { class: cn(sharedProse, "pointer-events-none") },
    },
  });

  useEffect(() => {
    editor?.commands.setContent(sanitizeHtml(html), { emitUpdate: false });
  }, [html, editor]);

  return <EditorContent editor={editor} className="text-sm" />;
}

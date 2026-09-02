"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import {
  Extension,
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
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/utils/html";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  "[&_hr]:my-3 [&_hr]:border-border",
);

/**
 * Dentro una lista Tab/Shift-Tab appartengono all'editor, non alla navigazione:
 * servono ad annidare o estrarre la voce. Le estensioni di TipTap però lasciano
 * passare l'evento quando il comando non è applicabile (tipicamente sulla prima
 * voce della lista, che non ha una voce sorella da cui dipendere) e il browser
 * porta il focus al controllo successivo, interrompendo la scrittura.
 *
 * Con priorità sotto la default (100) questa estensione gira dopo listItem e
 * taskItem: se hanno già annidato non viene nemmeno interrogata, altrimenti si
 * limita a ingoiare il tasto. Fuori dalle liste Tab resta la via d'uscita
 * dall'editor, come si aspetta chi naviga da tastiera.
 */
export const listTabGuard = Extension.create({
  name: "listTabGuard",
  priority: 50,
  addKeyboardShortcuts() {
    const inList = () =>
      this.editor.isActive("listItem") || this.editor.isActive("taskItem");
    return { Tab: inList, "Shift-Tab": inList };
  },
});

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
 * Normalizza l'URL digitato nel popover link: aggiunge `https://` se manca lo
 * schema (o `mailto:` per gli indirizzi email). Ritorna null se vuoto.
 * Coerente con l'ALLOWED_URI_REGEXP della sanitizzazione (lib/utils/html.ts).
 */
function normalizeLinkUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(?:https?:|mailto:)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/**
 * Editor rich-text WYSIWYG (TipTap / ProseMirror). Emette HTML semantico via
 * `onChange`; il valore HTML viene sanitizzato lato server prima di persistere
 * (vedi lib/utils/html.ts). Sostituisce il vecchio editor markdown.
 *
 * Il contenuto cresce con il testo fino a un tetto (dipendente da `size`) e poi
 * scrolla internamente: la toolbar resta sempre visibile perché è fuori
 * dall'area scrollabile. Con `expandable` un toggle porta l'editor a quasi
 * tutto schermo (overlay `fixed`, niente Dialog annidato: resta nel focus-trap
 * Radix del dialog ospite).
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
  size = "default",
  expandable = false,
  maxLength,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** "compact" per contesti angusti (quick add): min/max-height ridotti. */
  size?: "default" | "compact";
  /** Mostra il toggle per la modalità espansa quasi a tutto schermo. */
  expandable?: boolean;
  /** Limite caratteri della stringa HTML: mostra il contatore vicino al limite. */
  maxLength?: number;
  onSubmit?: () => void;
  onCancel?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);

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
      listTabGuard,
    ],
    content: value || "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(
          sharedProse,
          "focus:outline-none px-3 py-2",
          size === "compact" ? "min-h-[5rem]" : "min-h-[10rem]",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
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
      // Esc a due stadi: prima collassa la modalità espansa, poi annulla.
      // (L'Esc dentro il popover link non arriva qui: viene fermato lì.)
      if (expanded) {
        setExpanded(false);
        editor?.chain().focus().run();
      } else {
        onCancel?.();
      }
    }
  }

  const overLimit = maxLength != null && value.length > maxLength;
  // Il contatore appare solo quando ci si avvicina al limite: prima è rumore.
  const nearLimit = maxLength != null && value.length > maxLength * 0.75;

  return (
    <div
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-md border border-input bg-background transition-colors focus-within:border-coral/40 focus-within:ring-2 focus-within:ring-ring/30",
        expanded &&
          "fixed inset-4 z-[60] flex flex-col bg-card shadow-lg md:inset-x-[10%] md:inset-y-[6%]",
        disabled && "opacity-60",
      )}
    >
      <Toolbar
        editor={editor}
        disabled={disabled}
        expanded={expandable ? expanded : undefined}
        onToggleExpanded={
          expandable
            ? () => {
                setExpanded((v) => !v);
                editor?.chain().focus().run();
              }
            : undefined
        }
      />
      <div
        className={cn(
          "relative overflow-y-auto [scrollbar-gutter:stable]",
          expanded
            ? "flex-1"
            : size === "compact"
              ? "max-h-[40vh]"
              : "max-h-[55vh]",
        )}
      >
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
      {/* Sempre montato: se comparisse solo col focus, il blur al mousedown su
          un bottone sottostante (es. "Salva") sposterebbe il layout facendo
          mancare il click. `invisible` riserva lo spazio senza mostrare nulla. */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-t border-border/60 px-2 py-1 font-mono text-[0.625em] text-muted-foreground",
          !(focused || nearLimit) && "invisible",
        )}
      >
        <span aria-hidden className="hidden truncate sm:inline">
          **grassetto** · - elenco · ## titolo · --- divisore
        </span>
        {nearLimit && maxLength != null && (
          <span className={cn("ml-auto shrink-0", overLimit && "text-destructive")}>
            {value.length.toLocaleString("it-IT")} / {maxLength.toLocaleString("it-IT")}
          </span>
        )}
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  disabled,
  expanded,
  onToggleExpanded,
}: {
  editor: Editor | null;
  disabled: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
          }
        : null,
  });

  if (!editor) return null;

  function applyLink() {
    if (!editor) return;
    const url = normalizeLinkUrl(linkUrl);
    setLinkOpen(false);
    if (url === null) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function removeLink() {
    setLinkOpen(false);
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
      <Btn label="Annulla (⌘Z)" disabled={disabled || !state?.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-3.5" />
      </Btn>
      <Btn label="Ripristina (⌘⇧Z)" disabled={disabled || !state?.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-3.5" />
      </Btn>
      <Divider />
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
      <Btn label="Divisore" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-3.5" />
      </Btn>
      <Popover
        open={linkOpen}
        onOpenChange={(open) => {
          if (open) {
            setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
          } else {
            // Alla chiusura riportiamo il focus all'editor, non al bottone.
            editor.chain().focus().run();
          }
          setLinkOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Btn label="Link" active={state?.link} disabled={disabled} onClick={() => setLinkOpen((v) => !v)}>
            <Link2 className="size-3.5" />
          </Btn>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 p-2"
          // Esc/Enter restano nel popover: non devono chiudere l'editor o il dialog.
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://esempio.com"
              className="h-8 text-sm"
            />
            <button
              type="button"
              onClick={applyLink}
              className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:opacity-90"
            >
              Applica
            </button>
            {state?.link && (
              <button
                type="button"
                onClick={removeLink}
                className="shrink-0 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                Rimuovi
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {onToggleExpanded && (
        <>
          <span className="flex-1" />
          <Btn
            label={expanded ? "Riduci" : "Espandi"}
            active={expanded}
            disabled={disabled}
            onClick={onToggleExpanded}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Btn>
        </>
      )}
    </div>
  );
}

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
  ...props
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithRef<"button">, "onClick" | "children">) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      {...props}
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

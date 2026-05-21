/**
 * Utility per le checklist GFM (task list) dentro la descrizione markdown.
 *
 * Una "task-list item" è una riga il cui marker di lista (`-`, `*`, `+`,
 * oppure `1.` / `1)`) è seguito immediatamente da `[ ]`, `[x]` o `[X]`.
 *
 * `index` è la posizione zero-based tra le SOLE task-list item, in ordine di
 * documento (dall'alto verso il basso). Questo ordine DEVE combaciare con
 * l'ordine in cui react-markdown + remark-gfm emettono gli `<input type=checkbox>`
 * (vedi lib/utils/markdown.tsx): è il contratto di correttezza che lega il
 * renderer al toggle. Se le due definizioni divergono, cliccando la checkbox N
 * si modifica la riga sbagliata.
 */

// Marker di una task-list item all'inizio della riga (dopo eventuale indent):
//   "- [ ] ...", "* [x] ...", "+ [X] ...", "1. [ ] ...", "1) [x] ..."
// Il primo gruppo è il marker di lista, il secondo lo stato della checkbox.
export const TASK_LIST_ITEM_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]/;

/**
 * Inverte la Nth checkbox di una task list nel markdown:
 *   `[ ]` -> `[x]`,  `[x]`/`[X]` -> `[ ]`.
 *
 * Preserva ogni altro carattere (indentazione, tipo di marker, testo che segue).
 * Se `index` è fuori range (negativo o >= numero di checkbox) restituisce
 * l'input invariato. Deve essere idempotente: applicarlo due volte sullo stesso
 * indice riporta alla stringa originale.
 *
 * @param markdown sorgente markdown della descrizione
 * @param index    posizione zero-based tra le sole task-list item (ordine doc.)
 * @returns        una NUOVA stringa con quella sola checkbox invertita
 */
export function toggleTaskListItem(markdown: string, index: number): string {
  // TODO(user): implementa la logica di toggle.
  //
  // Suggerimenti / vincoli (coperti dai test in tests/unit/markdown-tasklist.test.ts):
  //   - Conta SOLO le righe che matchano TASK_LIST_ITEM_RE (in ordine di documento).
  //     Una riga "- foo" senza `[ ]` NON conta e non sposta l'indice.
  //   - Un `[ ]` che NON è in posizione di marker di lista (es. dentro un
  //     paragrafo) NON conta: àncora il match all'inizio riga (TASK_LIST_ITEM_RE).
  //   - Indice fuori range -> ritorna `markdown` invariato.
  //   - Inverti solo lo stato: " " <-> "x" (normalizza "X" a "x" oppure " ").
  //   - Limite noto accettabile per la v1: i `- [ ]` dentro un fenced code block
  //     possono essere ignorati o contati (documentalo nel test se li salti).
  throw new Error("toggleTaskListItem non implementata");
}

/**
 * Conta le task-list item in una stringa markdown (stessa definizione di
 * {@link toggleTaskListItem}). Usata da test e, volendo, dalla UI.
 */
export function countTaskListItems(markdown: string): number {
  // TODO(user): implementa il conteggio (stessa definizione di task-list item).
  throw new Error("countTaskListItems non implementata");
}

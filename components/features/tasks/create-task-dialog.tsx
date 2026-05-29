"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchTaskPickerOptionsAction } from "@/lib/actions/tasks";
import { QuickAddForm } from "./quick-add";
import type { PickItem } from "./quick-add-panel";

/**
 * Dialog unico di inserimento task. Wrappa il form ricco `QuickAddForm`
 * (parsing NLP, pickers, descrizione) ed è l'unico punto di creazione task
 * in tutta la UI: ogni "Aggiungi task" è solo un trigger di questo dialog.
 *
 * Preselezione contestuale (modificabile): aprendolo da un progetto si
 * preseleziona il progetto (+ eventuale sezione), da un cliente il cliente.
 *
 * Le opzioni dei pickers vengono caricate lazy alla prima apertura via
 * `fetchTaskPickerOptionsAction`, così i trigger non devono propagare le liste
 * progetti/clienti. Se chi monta il dialog ha già le liste (es. pagine che le
 * caricano comunque), può passarle come prop per evitare il fetch.
 */
export function CreateTaskDialog({
  defaultScheduledAt,
  defaultProjectId = null,
  defaultSectionId = null,
  defaultClientId = null,
  timezone,
  projects: projectsProp,
  clients: clientsProp,
  trigger,
  title = "Nuovo task",
}: {
  defaultScheduledAt?: Date;
  defaultProjectId?: string | null;
  defaultSectionId?: string | null;
  defaultClientId?: string | null;
  timezone?: string;
  projects?: PickItem[];
  clients?: PickItem[];
  /** Elemento cliccabile che apre il dialog. Default: pulsante "+ Aggiungi task". */
  trigger?: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<PickItem[]>(projectsProp ?? []);
  const [clients, setClients] = useState<PickItem[]>(clientsProp ?? []);
  const [loaded, setLoaded] = useState(
    projectsProp != null && clientsProp != null,
  );

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !loaded) {
      const res = await fetchTaskPickerOptionsAction();
      if (res.ok) {
        setProjects(res.data.projects);
        setClients(res.data.clients);
        setLoaded(true);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="group flex min-h-[2.125rem] w-full items-center gap-2 rounded-md border border-coral/40 bg-card/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-coral/60 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <Plus className="size-4 shrink-0 text-coral" /> Aggiungi task
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <QuickAddForm
          defaultScheduledAt={defaultScheduledAt}
          defaultProjectId={defaultProjectId}
          defaultSectionId={defaultSectionId}
          defaultClientId={defaultClientId}
          timezone={timezone}
          projects={projects}
          clients={clients}
          autoFocus
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

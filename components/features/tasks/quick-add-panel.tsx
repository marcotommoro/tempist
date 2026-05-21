"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Hash, User, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type PickItem = { id: string; name: string; color?: string | null };

/**
 * Tendine progetto + cliente del QuickAdd globale, selezionabili col mouse.
 * I token `#Progetto` / `!cliente:Nome` continuano a funzionare dal titolo: qui
 * mostriamo il nome del token (in grigio) finché non si sceglie esplicitamente.
 * La selezione esplicita ha la precedenza (gestita nell'action).
 */
export function QuickAddPickers({
  projects,
  clients,
  selectedProjectId,
  selectedClientId,
  onSelectProject,
  onSelectClient,
  tokenProjectName,
  tokenClientName,
  disabled,
}: {
  projects: PickItem[];
  clients: PickItem[];
  selectedProjectId: string | null;
  selectedClientId: string | null;
  onSelectProject: (id: string | null) => void;
  onSelectClient: (id: string | null) => void;
  tokenProjectName: string | null;
  tokenClientName: string | null;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Picker
        items={projects}
        selectedId={selectedProjectId}
        onSelect={onSelectProject}
        icon={<Hash className="size-3" />}
        placeholder="Progetto"
        tokenName={tokenProjectName}
        searchPlaceholder="Cerca progetto…"
        emptyText="Nessun progetto"
        disabled={disabled}
      />
      <Picker
        items={clients}
        selectedId={selectedClientId}
        onSelect={onSelectClient}
        icon={<User className="size-3" />}
        placeholder="Cliente"
        tokenName={tokenClientName}
        searchPlaceholder="Cerca cliente…"
        emptyText="Nessun cliente"
        disabled={disabled}
      />
    </div>
  );
}

function Picker({
  items,
  selectedId,
  onSelect,
  icon,
  placeholder,
  tokenName,
  searchPlaceholder,
  emptyText,
  disabled,
}: {
  items: PickItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  icon: ReactNode;
  placeholder: string;
  tokenName: string | null;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const fromToken = !selected && tokenName;
  const label = selected?.name ?? tokenName ?? placeholder;

  return (
    <div className="inline-flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded border border-border bg-card/40 px-2",
              "font-mono text-[0.6875em] transition-colors hover:bg-muted disabled:opacity-40",
              selected
                ? "text-foreground"
                : fromToken
                  ? "text-muted-foreground"
                  : "text-muted-foreground",
              selected && "border-coral/40 bg-coral/5",
            )}
          >
            <span className="opacity-70">{icon}</span>
            {label}
            {fromToken && <span className="opacity-50">(token)</span>}
            <ChevronDown className="size-3 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  Nessuno
                </CommandItem>
                {items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={it.name}
                    onSelect={() => {
                      onSelect(it.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: it.color ?? "var(--muted)" }}
                    />
                    <span className="truncate">{it.name}</span>
                    {selectedId === it.id && (
                      <Check className="ml-auto size-3.5 text-coral" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          aria-label={`Rimuovi ${placeholder.toLowerCase()}`}
          className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

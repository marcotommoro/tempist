"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckSquare,
  FolderKanban,
  Inbox,
  Search,
  Settings,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchAction } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/domain/search";

const QUICK_NAV = [
  { label: "Today", href: "/today", icon: Calendar },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Upcoming", href: "/upcoming", icon: Calendar },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Reports", href: "/reports", icon: CheckSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounce ricerca. Lo state setting avviene dentro startTransition o setTimeout
  // (entrambi async rispetto al render attuale, quindi non triggerano la regola
  // react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open) return;
    if (query.trim().length === 0) {
      const t = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(t);
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAction(query);
        setResults(r);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [open, query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Comandi"
      description="Cerca task, progetti, clienti o naviga"
    >
      <CommandInput
        placeholder="Cerca o digita un comando…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length === 0
            ? "Digita per cercare task / progetti / clienti."
            : "Nessun risultato."}
        </CommandEmpty>

        {/* Risultati ricerca */}
        {results.length > 0 && (
          <>
            <CommandGroup heading="Risultati">
              {results.map((r) => {
                if (r.kind === "task") {
                  return (
                    <CommandItem
                      key={`t-${r.id}`}
                      value={`task ${r.title}`}
                      onSelect={() =>
                        go(r.projectId ? `/projects/${r.projectId}` : "/inbox")
                      }
                    >
                      <CheckSquare className="size-4 mr-2 shrink-0" />
                      <span className="truncate">{r.title}</span>
                    </CommandItem>
                  );
                }
                if (r.kind === "project") {
                  return (
                    <CommandItem
                      key={`p-${r.id}`}
                      value={`project ${r.name}`}
                      onSelect={() => go(`/projects/${r.id}`)}
                    >
                      <span
                        className="size-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: r.color }}
                        aria-hidden
                      />
                      <span className="truncate">{r.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Progetto
                      </span>
                    </CommandItem>
                  );
                }
                return (
                  <CommandItem
                    key={`c-${r.id}`}
                    value={`client ${r.name}`}
                    onSelect={() => go(`/clients/${r.id}`)}
                  >
                    <span
                      className="size-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: r.color }}
                      aria-hidden
                    />
                    <span className="truncate">{r.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Cliente
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick navigation */}
        <CommandGroup heading="Vai a">
          {QUICK_NAV.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              value={`go ${label}`}
              onSelect={() => go(href)}
            >
              <Icon className="size-4 mr-2 shrink-0" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Suggerimento">
          <CommandItem disabled value="hint">
            <Search className="size-4 mr-2 opacity-50" />
            Apri con{" "}
            <kbd className="ml-1 px-1.5 py-0.5 rounded border text-[10px] bg-muted">
              ⌘K
            </kbd>
            <kbd className="ml-1 px-1.5 py-0.5 rounded border text-[10px] bg-muted">
              Ctrl+K
            </kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

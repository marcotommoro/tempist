"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
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
  CommandShortcut,
} from "@/components/ui/command";
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { searchAction } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/domain/search";

const QUICK_NAV = [
  { label: "Today", href: "/today", icon: Calendar },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Upcoming", href: "/upcoming", icon: CalendarDays },
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
        placeholder="Search anything…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length === 0
            ? "Type to search across tasks, projects, clients."
            : "No results."}
        </CommandEmpty>

        {/* Risultati ricerca */}
        {results.length > 0 && (
          <>
            <CommandGroup heading="Results">
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
                      <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{r.title}</span>
                      <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                        Task
                      </span>
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
                      <EntityColorMarker kind="project" color={r.color} />
                      <span className="truncate">{r.name}</span>
                      <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                        Project
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
                    <EntityColorMarker kind="client" color={r.color} />
                    <span className="truncate">{r.name}</span>
                    <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                      Client
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick navigation */}
        <CommandGroup heading="Navigate">
          {QUICK_NAV.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              value={`go ${label}`}
              onSelect={() => go(href)}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Tip">
          <CommandItem disabled value="hint">
            <Search className="size-4 shrink-0 opacity-50" />
            <span className="text-muted-foreground">Open from anywhere with</span>
            <CommandShortcut>⌘K</CommandShortcut>
            <CommandShortcut>Ctrl+K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Calendar,
  Clock,
  Filter as FilterIcon,
  FolderKanban,
  Inbox,
  Settings,
  Star,
  Users,
} from "lucide-react";

import type { Client } from "@/lib/db/schema";
import type { ProjectListItem } from "@/lib/domain/projects";
import type { MyWorkspace } from "@/lib/domain/workspaces";
import {
  ClientLink,
  ProjectLink,
  SidebarLink,
} from "@/components/features/sidebar/sidebar-link";
import { SidebarAccount } from "@/components/features/sidebar/sidebar-account";
import { WorkspaceSwitcher } from "@/components/features/workspaces/workspace-switcher";

const mainNav = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/upcoming", label: "Attività", icon: CalendarDays },
];

const bottomNav = [
  { href: "/filters", label: "Filters", icon: FilterIcon },
  { href: "/timesheet", label: "Timesheet", icon: Clock },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export type SidebarContentProps = {
  workspaces: MyWorkspace[];
  activeOrganizationId: string;
  favorites: ProjectListItem[];
  others: ProjectListItem[];
  sharedProjects: ProjectListItem[];
  clients: Client[];
  userEmail: string;
  isPlatformAdmin: boolean;
};

/**
 * Contenuto della sidebar, renderizzato server-side nel layout e riusato
 * sia nell'aside desktop sia nel drawer mobile (MobileSidebar).
 */
export function SidebarContent({
  workspaces,
  activeOrganizationId,
  favorites,
  others,
  sharedProjects,
  clients,
  userEmail,
  isPlatformAdmin,
}: SidebarContentProps) {
  return (
    <>
      {/* Workspace switcher */}
      <WorkspaceSwitcher workspaces={workspaces} activeId={activeOrganizationId} />

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-0.5" aria-label="Viste task">
          {mainNav.map(({ href, label, icon: Icon }) => (
            <SidebarLink
              key={href}
              href={href}
              icon={<Icon className="h-4 w-4" />}
              exact
            >
              {label}
            </SidebarLink>
          ))}
        </nav>

        {favorites.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-1.5 px-3 pb-1.5 text-eyebrow">
              <Star className="h-3 w-3" aria-hidden />
              <span>Favorites</span>
            </div>
            <div className="space-y-0.5" role="list">
              {favorites.map((p) => (
                <ProjectLink key={p.id} id={p.id} name={p.name} color={p.color} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between px-3 pb-1.5 text-eyebrow">
            <span>Projects</span>
            <Link
              href="/projects"
              className="rounded-sm p-0.5 transition-colors hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Vedi tutti i progetti / nuovo"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="space-y-0.5">
            {others.length === 0 && favorites.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                Nessun progetto.{" "}
                <Link href="/projects" className="text-coral underline-offset-2 hover:underline">
                  Crea il primo
                </Link>
                .
              </p>
            ) : (
              others.map((p) => (
                <ProjectLink key={p.id} id={p.id} name={p.name} color={p.color} />
              ))
            )}
          </div>
        </div>

        {sharedProjects.length > 0 && (
          <div className="mt-6">
            <div className="px-3 pb-1.5 text-eyebrow">
              Shared with me
            </div>
            <div className="space-y-0.5" role="list">
              {sharedProjects.map((p) => (
                <ProjectLink key={p.id} id={p.id} name={p.name} color={p.color} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between px-3 pb-1.5 text-eyebrow">
            <span>Clients</span>
            <Link
              href="/clients"
              className="rounded-sm p-0.5 transition-colors hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Vedi tutti i clienti / nuovo"
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="space-y-0.5">
            {clients.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                Nessun cliente.{" "}
                <Link href="/clients" className="text-coral underline-offset-2 hover:underline">
                  Crea il primo
                </Link>
                .
              </p>
            ) : (
              clients.map((c) => (
                <ClientLink key={c.id} id={c.id} name={c.name} color={c.color} />
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="px-3 pb-1.5 text-eyebrow">
            Workspace
          </div>
          <nav className="space-y-0.5" aria-label="Strumenti workspace">
            {bottomNav.map(({ href, label, icon: Icon }) => (
              <SidebarLink
                key={href}
                href={href}
                icon={<Icon className="h-4 w-4" />}
              >
                {label}
              </SidebarLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Account + theme pinned at bottom */}
      <SidebarAccount email={userEmail} isPlatformAdmin={isPlatformAdmin} />
    </>
  );
}

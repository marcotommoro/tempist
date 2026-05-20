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

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects, listSharedProjects } from "@/lib/domain/projects";
import { listMyWorkspaces } from "@/lib/domain/workspaces";
import { TimerWidget } from "@/components/features/timer/timer-widget";
import { GlobalManualEntryServer } from "@/components/features/timer/global-manual-entry-server";
import { NotificationsBellServer } from "@/components/features/notifications/notifications-bell-server";
import { CommandPalette } from "@/components/features/command-palette/command-palette";
import {
  ProjectLink,
  SidebarLink,
} from "@/components/features/sidebar/sidebar-link";
import { SidebarAccount } from "@/components/features/sidebar/sidebar-account";
import { WorkspaceSwitcher } from "@/components/features/workspaces/workspace-switcher";

const mainNav = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
];

const bottomNav = [
  { href: "/filters", label: "Filters", icon: FilterIcon },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/timesheet", label: "Timesheet", icon: Clock },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organizationId } = await requireActiveOrganization();
  const [projects, sharedProjects, workspaces] = await Promise.all([
    listProjects({ organizationId }),
    listSharedProjects({ userId: user.id, excludeOrganizationId: organizationId }),
    listMyWorkspaces(user.id),
  ]);

  const favorites = projects.filter((p) => p.isFavorite);
  const others = projects.filter((p) => !p.isFavorite);

  return (
    <div className="grid h-[100dvh] max-h-[100dvh] grid-cols-[260px_1fr] grid-rows-[56px_minmax(0,1fr)] overflow-hidden">
      {/* Skip to main content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Salta al contenuto
      </a>

      {/* Sidebar */}
      <aside
        className="row-span-2 flex min-h-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        aria-label="Navigazione principale"
      >
        {/* Workspace switcher */}
        <WorkspaceSwitcher workspaces={workspaces} activeId={organizationId} />

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
              <div className="flex items-center gap-1.5 px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
            <div className="flex items-center justify-between px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
                <p className="px-3 py-1.5 text-[12px] text-muted-foreground">
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
              <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
            <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
        <SidebarAccount email={user.email} />
      </aside>

      {/* Topbar — workspace tools only. Pinned by the parent grid row; the row never scrolls. */}
      <header className="z-20 flex items-center justify-end border-b border-border/70 bg-background/95 px-5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <GlobalManualEntryServer />
          <TimerWidget />
          <NotificationsBellServer />
        </div>
      </header>

      {/* Content — the ONLY scrollable region. Topbar + sidebar stay fixed. */}
      <main
        id="main-content"
        className="min-h-0 overflow-y-auto overflow-x-hidden"
        tabIndex={-1}
      >
        <div className="mx-auto w-full max-w-3xl px-6 pb-16">{children}</div>
      </main>

      {/* Command palette globale (Cmd+K) */}
      <CommandPalette />
    </div>
  );
}

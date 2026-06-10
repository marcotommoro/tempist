import { getPlatformRole } from "@/lib/auth/platform-role";
import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects, listSharedProjects } from "@/lib/domain/projects";
import { listMyWorkspaces } from "@/lib/domain/workspaces";
import { TimerWidget } from "@/components/features/timer/timer-widget";
import { GlobalManualEntryServer } from "@/components/features/timer/global-manual-entry-server";
import { NotificationsBellServer } from "@/components/features/notifications/notifications-bell-server";
import { CommandPalette } from "@/components/features/command-palette/command-palette";
import { TopbarBreadcrumb } from "@/components/features/topbar/topbar-breadcrumb";
import { MobileSidebar } from "@/components/features/sidebar/mobile-sidebar";
import { SidebarContent } from "@/components/features/sidebar/sidebar-content";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organizationId } = await requireActiveOrganization();
  const [projects, sharedProjects, clients, workspaces] = await Promise.all([
    listProjects({ organizationId }),
    listSharedProjects({ userId: user.id, excludeOrganizationId: organizationId }),
    listClients({ organizationId }),
    listMyWorkspaces(user.id),
  ]);

  const favorites = projects.filter((p) => p.isFavorite);
  const others = projects.filter((p) => !p.isFavorite);

  // Props condivise: il fetch avviene una sola volta qui, il markup della
  // sidebar viene riusato sia nell'aside desktop sia nel drawer mobile.
  const sidebarProps = {
    workspaces,
    activeOrganizationId: organizationId,
    favorites,
    others,
    sharedProjects,
    clients,
    userEmail: user.email,
    isPlatformAdmin: getPlatformRole(user) === "admin",
  };

  return (
    <div className="grid h-[100dvh] max-h-[100dvh] grid-cols-1 grid-rows-[60px_minmax(0,1fr)] overflow-hidden lg:grid-cols-[252px_1fr]">
      {/* Skip to main content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Salta al contenuto
      </a>

      {/* Sidebar — visibile solo da lg; sotto è sostituita dal drawer in topbar */}
      <aside
        className="row-span-2 hidden min-h-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
        aria-label="Navigazione principale"
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Topbar — workspace tools only. Pinned by the parent grid row; the row never scrolls. */}
      <header className="z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-6">
        <MobileSidebar>
          <SidebarContent {...sidebarProps} />
        </MobileSidebar>
        <TopbarBreadcrumb />
        <div className="ml-auto flex items-center gap-2.5">
          <GlobalManualEntryServer />
          <TimerWidget />
          <NotificationsBellServer />
        </div>
      </header>

      {/* Content — the ONLY scrollable region. Topbar + sidebar stay fixed. */}
      <main
        id="main-content"
        data-content-scope
        className="min-h-0 overflow-y-auto overflow-x-hidden"
        tabIndex={-1}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">{children}</div>
      </main>

      {/* Command palette globale (Cmd+K) */}
      <CommandPalette />
    </div>
  );
}

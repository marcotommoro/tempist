import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Calendar,
  FolderKanban,
  Inbox,
  Settings,
  Star,
  Users,
} from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects } from "@/lib/domain/projects";

const mainNav = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
];

const bottomNav = [
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organizationId } = await requireActiveOrganization();
  const projects = await listProjects({ organizationId });

  const favorites = projects.filter((p) => p.isFavorite);
  const others = projects.filter((p) => !p.isFavorite);

  return (
    <div className="flex-1 grid grid-cols-[260px_1fr] grid-rows-[56px_1fr] min-h-screen">
      {/* Sidebar */}
      <aside className="row-span-2 border-r border-sidebar-border bg-sidebar text-sidebar-foreground py-4 overflow-y-auto">
        <div className="px-4 mb-3">
          <div className="text-sm font-semibold">Todoist+Tracker</div>
        </div>

        <nav className="px-3 space-y-0.5">
          {mainNav.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={href} href={href} icon={<Icon className="w-4 h-4" />}>
              {label}
            </SidebarLink>
          ))}
        </nav>

        {favorites.length > 0 && (
          <div className="mt-6 px-3">
            <div className="px-2 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Star className="w-3 h-3" />
              Favorites
            </div>
            <div className="space-y-0.5">
              {favorites.map((p) => (
                <ProjectLink key={p.id} id={p.id} name={p.name} color={p.color} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 px-3">
          <div className="px-2 mb-1 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            <span>Projects</span>
            <Link href="/projects" className="hover:text-foreground" title="Vedi tutti / nuovo">
              <FolderKanban className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {others.length === 0 && favorites.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Nessun progetto.{" "}
                <Link href="/projects" className="underline hover:text-foreground">
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

        <div className="mt-6 px-3">
          <div className="px-2 mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <nav className="space-y-0.5">
            {bottomNav.map(({ href, label, icon: Icon }) => (
              <SidebarLink key={href} href={href} icon={<Icon className="w-4 h-4" />}>
                {label}
              </SidebarLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Topbar */}
      <header className="border-b border-border flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">
          Workspace{" "}
          <span className="font-medium text-foreground">{organizationId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">[timer slot]</div>
          <span className="text-sm">{user.email}</span>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}

function ProjectLink({ id, name, color }: { id: string; name: string; color: string }) {
  return (
    <Link
      href={`/projects/${id}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </Link>
  );
}

import Link from "next/link";
import { requireActiveOrganization } from "@/lib/auth/workspace";
import { Inbox, Calendar, CalendarDays, FolderKanban, Users, BarChart3, Settings } from "lucide-react";

const navItems = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organizationId } = await requireActiveOrganization();

  return (
    <div className="flex-1 grid grid-cols-[240px_1fr] grid-rows-[56px_1fr] min-h-screen">
      {/* Sidebar */}
      <aside className="row-span-2 border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-4 space-y-1">
        <div className="px-2 py-2 mb-2 text-sm font-semibold">Todoist+Tracker</div>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </aside>

      {/* Topbar */}
      <header className="border-b border-border flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">
          Workspace <span className="font-medium text-foreground">{organizationId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Slot timer globale — popolato in Fase 2 */}
          <div className="text-xs text-muted-foreground">[timer slot]</div>
          <span className="text-sm">{user.email}</span>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 overflow-auto">{children}</main>
    </div>
  );
}

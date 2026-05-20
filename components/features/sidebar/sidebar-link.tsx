"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SidebarLink({
  href,
  icon,
  children,
  exact = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  /** Match esatto del path (per evitare "/projects" che si attiva su "/projects/123") */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md pl-3 pr-2.5 text-[13px] transition-colors duration-[var(--dur-fast)]",
        active
          ? "bg-sidebar-accent text-foreground font-medium shadow-xs"
          : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-sm bg-coral transition-opacity duration-[var(--dur-fast)]",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function ProjectLink({
  id,
  name,
  color,
}: {
  id: string;
  name: string;
  color: string;
}) {
  const pathname = usePathname();
  const href = `/projects/${id}`;
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md pl-3 pr-2.5 text-[13px] transition-colors duration-[var(--dur-fast)]",
        active
          ? "bg-sidebar-accent text-foreground font-medium shadow-xs"
          : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-sm bg-coral transition-opacity duration-[var(--dur-fast)]",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </Link>
  );
}

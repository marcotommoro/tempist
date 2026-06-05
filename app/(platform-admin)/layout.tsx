import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-display text-xl tracking-[-0.02em]">
              Tempist Admin
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((item) => (
                <AdminNavLink key={item.href} href={item.href} exact={item.exact}>
                  {item.label}
                </AdminNavLink>
              ))}
            </nav>
          </div>
          <Link
            href="/today"
            className="font-mono text-[0.6875em] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Torna all&apos;app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 font-mono text-[0.6875em] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      )}
      data-exact={exact ? "true" : undefined}
    >
      {children}
    </Link>
  );
}

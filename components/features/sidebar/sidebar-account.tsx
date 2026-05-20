"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/features/topbar/theme-switcher";
import { signOut } from "@/lib/auth/client";

export function SidebarAccount({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-sidebar-border bg-sidebar px-3 py-3">
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Apri menu account"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-foreground font-mono text-[0.625em] font-medium uppercase tracking-wider text-background"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.75em] font-medium text-foreground">
                  {email}
                </span>
                <span className="block font-mono text-[0.5625em] uppercase tracking-[0.14em] text-muted-foreground">
                  Account
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-56">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-1.5 text-[0.75em] text-foreground">
              <span className="block truncate" title={email}>
                {email}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
              disabled={pending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut />
              {pending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5 text-[0.6875em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="size-3" />
                You
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeSwitcher />
      </div>
    </div>
  );
}

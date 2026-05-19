"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { inviteWorkspaceMemberAction } from "@/lib/actions/workspaces";

export function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", trimmed);
      fd.set("role", role);
      const res = await inviteWorkspaceMemberAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEmail("");
      setSuccess(`Invito inviato a ${trimmed}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          placeholder="email@dominio.com"
          autoComplete="off"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member")}
          disabled={pending}
          className="rounded-md border border-input bg-background px-2 py-2 text-xs disabled:opacity-50"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          {pending ? "Invio…" : "Invita"}
        </button>
      </div>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
      {success && <p className="font-mono text-[11px] text-coral">{success}</p>}
    </form>
  );
}

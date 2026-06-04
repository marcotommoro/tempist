"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientAction } from "@/lib/actions/clients";
import type { Client } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

export type ClientForEdit = Pick<
  Client,
  "id" | "name" | "email" | "vatNumber" | "currency" | "hourlyRateDefault" | "color"
>;

function EditClientForm({
  client,
  onClose,
}: {
  client: ClientForEdit;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [vatNumber, setVatNumber] = useState(client.vatNumber ?? "");
  const [rate, setRate] = useState(client.hourlyRateDefault ?? "");
  const [currency, setCurrency] = useState(client.currency);
  const [color, setColor] = useState(client.color);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("email", email.trim());
      fd.set("vatNumber", vatNumber.trim());
      fd.set("hourlyRateDefault", rate.trim());
      fd.set("currency", currency);
      fd.set("color", color);
      const res = await updateClientAction(client.id, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="edit-client-name">Nome *</Label>
          <Input
            id="edit-client-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={120}
            required
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="edit-client-email">Email</Label>
          <Input
            id="edit-client-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            placeholder="billing@…"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="edit-client-vat">P.IVA</Label>
          <Input
            id="edit-client-vat"
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            disabled={pending}
            maxLength={40}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="edit-client-rate">Tariffa default (ora)</Label>
          <Input
            id="edit-client-rate"
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={pending}
            placeholder="80.00"
            className="font-mono tabular-nums"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="edit-client-currency">Valuta</Label>
          <select
            id="edit-client-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={pending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <span className="font-mono text-[0.625em] uppercase tracking-[0.14em] text-muted-foreground">
          Colore
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Colore ${c}`}
              disabled={pending}
              className={cn(
                "h-5 w-5 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all disabled:opacity-50",
                color === c
                  ? "ring-foreground"
                  : "ring-transparent hover:ring-foreground/30",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Annulla
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditClientDialog({
  client,
  trigger,
  open,
  onOpenChange,
}: {
  client: ClientForEdit;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Modifica cliente
          </DialogTitle>
          <DialogDescription>
            Aggiorna anagrafica, tariffa e colore. Le voci di tempo già registrate
            mantengono la tariffa congelata.
          </DialogDescription>
        </DialogHeader>
        {currentOpen ? (
          <EditClientForm
            key={client.id}
            client={client}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function EditClientDialogButton({
  client,
  className,
}: {
  client: ClientForEdit;
  className?: string;
}) {
  return (
    <EditClientDialog
      client={client}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", className)}
          aria-label={`Modifica ${client.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="size-3.5" />
        </Button>
      }
    />
  );
}

export function EditClientDialogHeaderButton({
  client,
}: {
  client: ClientForEdit;
}) {
  return (
    <EditClientDialog
      client={client}
      trigger={
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Modifica
        </Button>
      }
    />
  );
}

export default function VerifyRequestPage() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Controlla la tua email</h1>
      <p className="text-sm text-neutral-500">
        Ti abbiamo inviato un magic link per accedere. Cliccalo entro 5 minuti.
      </p>
      <p className="text-xs text-neutral-400">
        In dev senza Resend configurato, il link è stampato sulla console del server.
      </p>
    </div>
  );
}

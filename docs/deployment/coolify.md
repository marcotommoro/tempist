# Deploy su Coolify

L'app gira **interamente self-hosted** sul tuo server Coolify. Postgres è gestito da te (un container Coolify dedicato).

## Architettura prod

```
┌─────────────────────────────────────────────┐
│              Coolify server                 │
│                                             │
│   ┌─────────────────┐                       │
│   │ todoist-app     │  (Dockerfile)         │
│   │ Next.js 16      │  → port 3000          │
│   │ standalone      │                       │
│   └────────┬────────┘                       │
│            │                                │
│   ┌────────▼──────────────────┐             │
│   │ Postgres 16 (managed)     │             │
│   │ schemas: public, pgboss   │             │
│   └────────▲──────────────────┘             │
│            │                                │
│   ┌────────┴────────┐                       │
│   │ todoist-worker  │  (Dockerfile.worker)  │
│   │ pg-boss         │                       │
│   └─────────────────┘                       │
│                                             │
└─────────────────────────────────────────────┘
                    │
                    │  HTTPS (Let's Encrypt via Coolify)
                    ▼
              tuo-dominio.com
```

## Step di deploy

### 1. Crea il database Postgres su Coolify

- Coolify > New Resource > PostgreSQL > Postgres 16
- Annota la `DATABASE_URL` (Coolify la mostra al provisioning)

### 2. Resource "todoist-app"

- Coolify > New Resource > Application > Dockerfile
- Repository: il tuo repo GitHub
- Branch: `main`
- Dockerfile path: `./Dockerfile`
- Build context: `.`
- Port: `3000`
- Domain: assegna un dominio (Coolify configura HTTPS automaticamente)

**Environment variables:**

```
DATABASE_URL=<dal step 1>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://tuo-dominio.com
NEXT_PUBLIC_APP_URL=https://tuo-dominio.com
RESEND_API_KEY=<da resend.com>
RESEND_FROM_EMAIL=noreply@tuo-dominio.com
GOOGLE_CLIENT_ID=<google cloud console>
GOOGLE_CLIENT_SECRET=<google cloud console>
GITHUB_CLIENT_ID=<github settings/developers>
GITHUB_CLIENT_SECRET=<github settings/developers>
NODE_ENV=production
```

**Pre-deploy hook (su Coolify):**

```
pnpm db:migrate
```

Esegue le migrations sul DB prima di avviare il container.

### 3. Resource "todoist-worker"

- Coolify > New Resource > Application > Dockerfile
- Repository: stesso
- Dockerfile path: `./Dockerfile.worker`
- Port: **nessuno** (no expose)
- Domain: **nessuno**

**Environment variables:** stesse di `todoist-app` (in particolare `DATABASE_URL` identica).

### 4. Auto-deploy

Coolify supporta webhook GitHub: ogni push a `main` triggera build + deploy. Attivalo in: Application > Settings > Auto Deploy.

In alternativa puoi triggerare manualmente da Coolify UI.

## Verifica post-deploy

1. Apri il dominio HTTPS → vedi landing page
2. Click "Accedi" → form sign-in
3. Inserisci email → arriva magic link da Resend
4. Click link → `/today` con sidebar e workspace creato automaticamente
5. Coolify > todoist-worker > Logs → vedi `[health-check] alive @ ...` ogni minuto

## Backup

Coolify Postgres ha backup automatici configurabili in Resource > Backups. Imposta retention >= 7 giorni.

## Rollback

Coolify mantiene gli ultimi N deploy. Application > Deployments > clicca un deploy precedente > Redeploy.

## Troubleshooting

| Sintomo | Probabile causa | Fix |
|---|---|---|
| 500 al login social | OAuth redirect URI sbagliato | Aggiungi `https://tuo-dominio.com/api/auth/callback/google` al provider |
| Magic link arriva ma 404 | `BETTER_AUTH_URL` errato | Allinea con il dominio reale (https) |
| Worker non scrive job | `DATABASE_URL` diversa fra app e worker | Verifica env var identica nei due resource |
| Build fallisce su `prisma generate` | Migration in step pre-deploy fallita | Controlla Logs > Build, esegui manualmente `pnpm db:migrate` con env var corretto |

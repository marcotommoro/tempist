# Deploy on Coolify

The app runs **fully self-hosted** on your Coolify server. You manage Postgres yourself (a dedicated Coolify container).

## Production architecture

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
              your-domain.com
```

## Deploy steps

### 1. Create the Postgres database on Coolify

- Coolify > New Resource > PostgreSQL > Postgres 16
- Note the `DATABASE_URL` (Coolify shows it at provisioning)

### 2. Resource "todoist-app"

- Coolify > New Resource > Application > Dockerfile
- Repository: your GitHub repo
- Branch: `main`
- Dockerfile path: `./Dockerfile`
- Build context: `.`
- Port: `3000`
- Domain: assign a domain (Coolify configures HTTPS automatically)

**Environment variables:**

```
DATABASE_URL=<from step 1>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
RESEND_API_KEY=<from resend.com>
RESEND_FROM_EMAIL=noreply@your-domain.com
GOOGLE_CLIENT_ID=<google cloud console>
GOOGLE_CLIENT_SECRET=<google cloud console>
GITHUB_CLIENT_ID=<github settings/developers>
GITHUB_CLIENT_SECRET=<github settings/developers>
NODE_ENV=production
```

**Pre-deploy hook (on Coolify):**

```
pnpm db:migrate
```

Runs migrations on the DB before starting the container.

### 3. Resource "todoist-worker"

- Coolify > New Resource > Application > Dockerfile
- Repository: same repo
- Dockerfile path: `./Dockerfile.worker`
- Port: **none** (no expose)
- Domain: **none**

**Environment variables:** same as `todoist-app` (especially the same `DATABASE_URL`).

### 4. Auto-deploy

Coolify supports GitHub webhooks: each push to `main` triggers build + deploy. Enable it under: Application > Settings > Auto Deploy.

You can also trigger deploys manually from the Coolify UI.

## Post-deploy verification

1. Open the HTTPS domain → landing page loads
2. Click "Sign in" → sign-in form
3. Enter email → magic link arrives from Resend
4. Click link → `/today` with sidebar and workspace auto-created
5. Coolify > todoist-worker > Logs → see `[health-check] alive @ ...` every minute

## Backup

Coolify Postgres has configurable automatic backups under Resource > Backups. Set retention >= 7 days.

## Rollback

Coolify keeps the last N deploys. Application > Deployments > click a previous deploy > Redeploy.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 on social login | Wrong OAuth redirect URI | Add `https://your-domain.com/api/auth/callback/google` to the provider |
| Magic link arrives but 404 | Wrong `BETTER_AUTH_URL` | Align with the real domain (https) |
| Worker does not process jobs | Different `DATABASE_URL` between app and worker | Verify identical env vars on both resources |
| Build fails on `prisma generate` | Migration in pre-deploy step failed | Check Logs > Build, run `pnpm db:migrate` manually with correct env |

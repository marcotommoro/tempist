/**
 * Better Auth configuration.
 *
 * Plugins enabled:
 *   - magicLink:   passwordless via email (Resend)
 *   - organization: multi-workspace ("Workspace" in UI)
 *
 * Hook databaseHooks.user.create.after:
 *   - Al primo signup crea automaticamente un'organization personale,
 *     vi aggiunge lo user come `owner`, e la imposta come activeOrganization.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { Resend } from "resend";

import { db, schema } from "@/lib/db";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

// ANSI escape codes — funzionano in tutti i terminali moderni (iTerm, VS Code, Warp, Ghostty).
// In ambiente non-TTY (CI, container senza terminale) sono semplicemente ignorati: nessun danno.
const C = {
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

/**
 * E2E test mode: scrive l'URL del magic link in un file leggibile dal test runner.
 * Attivo solo se E2E_TEST=1 (non in produzione). Vedi tests/e2e/helpers/auth.ts.
 */
async function writeE2EMagicLink(email: string, url: string): Promise<void> {
  if (process.env.E2E_TEST !== "1") return;
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), ".e2e-magic-links");
    await mkdir(dir, { recursive: true });
    const safe = email.replace(/[^a-zA-Z0-9._-]/g, "_");
    await writeFile(join(dir, `${safe}.txt`), url, "utf8");
  } catch (err) {
    console.error("[auth E2E] errore scrivendo magic link file", err);
  }
}

function printMagicLinkBanner(email: string, url: string) {
  const bar = "━".repeat(70);
  console.log(
    [
      "",
      `${C.cyan}${bar}`,
      `${C.bold}🔗 MAGIC LINK (dev mode — RESEND_API_KEY non configurata)${C.reset}${C.cyan}`,
      bar,
      `${C.reset}To: ${C.bold}${email}${C.reset}`,
      "",
      // URL su riga propria → Cmd+click nei terminali moderni
      url,
      "",
      `${C.dim}(il link scade tra 5 minuti)${C.reset}`,
      `${C.cyan}${bar}${C.reset}`,
      "",
    ].join("\n"),
  );
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `${C.red}[auth] CRITICAL: NODE_ENV=production ma RESEND_API_KEY mancante — email NON spedita a ${to}${C.reset}`,
      );
    }
    console.log(
      `\n${C.yellow}[email mock]${C.reset} To: ${to}\nSubject: ${subject}\n\n${text}\n`,
    );
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, text });
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],

  user: {
    additionalFields: {
      timezone: { type: "string", defaultValue: "Europe/Rome" },
      locale: { type: "string", defaultValue: "it" },
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },

  emailAndPassword: { enabled: false },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // E2E test runner: scrive il link su filesystem per il setup Playwright
        await writeE2EMagicLink(email, url);

        if (!resend) {
          // Dev fallback: banner colorato con URL cliccabile direttamente nel terminale.
          if (process.env.NODE_ENV === "production") {
            console.error(
              `${C.red}[auth] CRITICAL: NODE_ENV=production ma RESEND_API_KEY mancante — magic link NON spedito a ${email}${C.reset}`,
            );
          }
          printMagicLinkBanner(email, url);
          return;
        }
        await sendEmail(
          email,
          "Accedi a Tempist",
          `Clicca qui per accedere:\n\n${url}\n\nIl link scade tra 5 minuti.`,
        );
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      async sendInvitationEmail({ id, email, inviter, organization: org }) {
        const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
        const acceptUrl = `${base}/invitations/workspace/${id}`;
        const inviterName = inviter.user.name ?? inviter.user.email;

        // E2E test runner: scrive il link su filesystem (riusa stessa convention dei magic link)
        await writeE2EMagicLink(`invite-${email}`, acceptUrl);

        if (!resend) {
          if (process.env.NODE_ENV === "production") {
            console.error(
              `${C.red}[auth] CRITICAL: invito workspace non spedito (RESEND mancante) → ${email}${C.reset}`,
            );
          }
          const bar = "━".repeat(70);
          console.log(
            [
              "",
              `${C.cyan}${bar}`,
              `${C.bold}📩 WORKSPACE INVITE (dev mode)${C.reset}${C.cyan}`,
              bar,
              `${C.reset}From: ${C.bold}${inviterName}${C.reset}`,
              `To: ${C.bold}${email}${C.reset}`,
              `Workspace: ${C.bold}${org.name}${C.reset}`,
              "",
              acceptUrl,
              "",
              `${C.cyan}${bar}${C.reset}`,
              "",
            ].join("\n"),
          );
          return;
        }

        await sendEmail(
          email,
          `${inviterName} ti ha invitato al workspace "${org.name}"`,
          `${inviterName} ti ha invitato a unirti al workspace "${org.name}" su Tempist.\n\nClicca qui per accettare:\n\n${acceptUrl}\n\nSe non hai un account verrà creato automaticamente con questa email.`,
        );
      },
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          // Crea organization personale + member OWNER + setta come activeOrganizationId
          // alla prima sessione (gestito lato server quando recuperiamo activeOrganization).
          const slugBase = (newUser.name ?? newUser.email.split("@")[0] ?? "user")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 24);
          const slug = `${slugBase}-${newUser.id.slice(0, 6)}`;

          const [org] = await db
            .insert(schema.organization)
            .values({ name: "Personal", slug })
            .returning();

          if (!org) {
            console.error("[auth] Impossibile creare personal organization per user", newUser.id);
            return;
          }

          await db.insert(schema.member).values({
            organizationId: org.id,
            userId: newUser.id,
            role: "owner",
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;

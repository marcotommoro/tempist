/**
 * Email helper per inviti project-level. (Gli inviti workspace passano per
 * Better Auth → `sendInvitationEmail` configurato in `lib/auth/config.ts`.)
 *
 * Mantiene lo stesso pattern dev/E2E/prod di magic-link per coerenza.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

const C = {
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

async function writeE2EFile(email: string, url: string) {
  if (process.env.E2E_TEST !== "1") return;
  try {
    const dir = join(process.cwd(), ".e2e-magic-links");
    await mkdir(dir, { recursive: true });
    const safe = `project-invite-${email}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    await writeFile(join(dir, `${safe}.txt`), url, "utf8");
  } catch (err) {
    console.error("[email] errore scrivendo invite file E2E", err);
  }
}

export async function sendProjectInviteEmail(opts: {
  to: string;
  inviterName: string;
  projectName: string;
  acceptUrl: string;
}): Promise<void> {
  const { to, inviterName, projectName, acceptUrl } = opts;
  const subject = `${inviterName} ti ha invitato al progetto "${projectName}"`;
  const text = `${inviterName} ti ha invitato a collaborare al progetto "${projectName}" su Todoist+Tracker.\n\nClicca qui per accettare:\n\n${acceptUrl}\n\nL'invito scade tra 7 giorni. Se non hai un account verrà creato automaticamente con questa email.`;

  await writeE2EFile(to, acceptUrl);

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[email] CRITICAL: project invite non spedito a ${to} (RESEND mancante)`);
    }
    const bar = "━".repeat(70);
    console.log(
      [
        "",
        `${C.cyan}${bar}`,
        `${C.bold}📩 PROJECT INVITE (dev mode)${C.reset}${C.cyan}`,
        bar,
        `${C.reset}From: ${C.bold}${inviterName}${C.reset}`,
        `To: ${C.bold}${to}${C.reset}`,
        `Project: ${C.bold}${projectName}${C.reset}`,
        "",
        acceptUrl,
        "",
        `${C.cyan}${bar}${C.reset}`,
        "",
      ].join("\n"),
    );
    return;
  }

  await resend.emails.send({ from: FROM_EMAIL, to, subject, text });
}

/**
 * Email sender condiviso — wrapper su Resend con dev fallback.
 *
 * In dev (RESEND_API_KEY assente): logga subject + body in console.
 * In prod (RESEND_API_KEY presente): invia via Resend.
 * In prod senza key: logga CRITICAL + non manda (fallback safe).
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

const C = {
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text fallback */
  text: string;
  /** HTML opzionale (alcuni client lo preferiscono) */
  html?: string;
};

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `${C.red}[email] CRITICAL: NODE_ENV=production ma RESEND_API_KEY mancante — email NON spedita a ${msg.to}${C.reset}`,
      );
      return;
    }
    console.log(
      `\n${C.yellow}[email mock]${C.reset} To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`,
    );
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
}

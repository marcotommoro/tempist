/**
 * Proxy: redirect a /sign-in se l'utente non ha il cookie di sessione sulle rotte protette.
 * Il check completo (sessione valida in DB) resta in requireSession() / requireActiveOrganization().
 *
 * Non reindirizzare /sign-in → /today in base al solo cookie: un token scaduto/invalido
 * causerebbe un loop con il layout autenticato (Better Auth docs: cookie-only check is not secure).
 */

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_MAX_AGE } from "@/lib/auth/constants";

const SESSION_COOKIE_NAMES = ["__Secure-better-auth.session_token", "better-auth.session_token"];

const PROTECTED_PREFIXES = [
  "/today",
  "/tasks",
  "/inbox",
  "/upcoming",
  "/projects",
  "/clients",
  "/reports",
  "/settings",
  "/timesheet",
  "/filters",
  "/payments",
  "/admin",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = getSessionCookie(req);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Better Auth rinnova la scadenza in DB ma dai Server Component non può riscrivere il cookie:
  // lo facciamo scorrere qui, stesso valore. La validità resta verificata da requireSession().
  for (const name of SESSION_COOKIE_NAMES) {
    const value = req.cookies.get(name)?.value;
    if (!value) continue;
    res.cookies.set(name, value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: name.startsWith("__Secure-"),
      maxAge: SESSION_MAX_AGE,
    });
  }
  return res;
}

export const config = {
  matcher: [
    // Tutte le route eccetto: _next, api, favicon, public assets
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.svg).*)",
  ],
};

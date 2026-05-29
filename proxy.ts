/**
 * Proxy: redirect a /sign-in se l'utente non ha il cookie di sessione sulle rotte protette.
 * Il check completo (sessione valida in DB) resta in requireSession() / requireActiveOrganization().
 *
 * Non reindirizzare /sign-in → /today in base al solo cookie: un token scaduto/invalido
 * causerebbe un loop con il layout autenticato (Better Auth docs: cookie-only check is not secure).
 */

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/today", "/inbox", "/upcoming", "/projects", "/clients", "/reports", "/settings"];

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tutte le route eccetto: _next, api, favicon, public assets
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.svg).*)",
  ],
};

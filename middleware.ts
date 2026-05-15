/**
 * Middleware: redirect a /sign-in se l'utente non e' autenticato per le rotte protette.
 * Better Auth gestisce la sessione via cookie; qui controlliamo solo la presenza del cookie
 * della session token (l'app esegue il check completo lato server con getSession).
 */

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/today", "/inbox", "/upcoming", "/projects", "/clients", "/reports", "/settings"];
const AUTH_PAGES = ["/sign-in", "/verify-request"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("better-auth.session_token");

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
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

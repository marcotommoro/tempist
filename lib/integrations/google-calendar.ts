/**
 * Google Calendar API wrapper — push-only (task → event).
 *
 * Uso `fetch` diretto su https://www.googleapis.com/calendar/v3 (niente googleapis SDK
 * per evitare un dep da ~30MB). Endpoint usati:
 *   - GET  /users/me/calendarList     → discover primary calendar
 *   - POST /calendars/{cid}/events    → insert
 *   - PATCH /calendars/{cid}/events/{eid} → update
 *   - DELETE /calendars/{cid}/events/{eid} → delete
 *   - POST oauth2 token endpoint per refresh
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";
const PRIMARY = "primary";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
};

export type GoogleEvent = {
  id: string;
  etag: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: "confirmed" | "tentative" | "cancelled";
  updated?: string;
};

/**
 * Scambia un authorization code per access+refresh tokens.
 */
export async function exchangeCodeForTokens(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(
      `Google token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Refresh access token usando il refresh_token salvato.
 */
export async function refreshAccessToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(
      `Google token refresh failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Recupera info utente Google (per `externalAccountId`).
 */
export async function fetchUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return (await res.json()) as { sub: string; email: string; name?: string };
}

export type EventInput = {
  summary: string;
  description?: string;
  /** ISO datetime UTC */
  startIso: string;
  /** ISO datetime UTC; se omesso → start + 1h */
  endIso?: string;
  /** Se true → status = cancelled (event nascosto) */
  cancelled?: boolean;
};

function eventBody(input: EventInput) {
  const end =
    input.endIso ??
    new Date(new Date(input.startIso).getTime() + 60 * 60_000).toISOString();
  return {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso },
    end: { dateTime: end },
    status: input.cancelled ? "cancelled" : "confirmed",
  };
}

export async function insertEvent(opts: {
  accessToken: string;
  event: EventInput;
}): Promise<GoogleEvent> {
  const res = await fetch(`${CAL_BASE}/calendars/${PRIMARY}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody(opts.event)),
  });
  if (!res.ok) {
    throw new Error(`Google insertEvent failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleEvent;
}

export async function patchEvent(opts: {
  accessToken: string;
  eventId: string;
  event: EventInput;
}): Promise<GoogleEvent> {
  const res = await fetch(
    `${CAL_BASE}/calendars/${PRIMARY}/events/${encodeURIComponent(opts.eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody(opts.event)),
    },
  );
  if (!res.ok) {
    throw new Error(`Google patchEvent failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleEvent;
}

export async function deleteEvent(opts: {
  accessToken: string;
  eventId: string;
}): Promise<void> {
  const res = await fetch(
    `${CAL_BASE}/calendars/${PRIMARY}/events/${encodeURIComponent(opts.eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${opts.accessToken}` },
    },
  );
  // 410 Gone è ok (già cancellato)
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google deleteEvent failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Restituisce l'URL OAuth a cui redirigere l'utente.
 * Scope: solo eventi calendario (lettura+scrittura) + email+profile per externalAccountId.
 */
export function buildAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

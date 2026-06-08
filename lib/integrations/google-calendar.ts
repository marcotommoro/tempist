/**
 * Google Calendar API wrapper — bidirectional sync (task ↔ event).
 *
 * Uso `fetch` diretto su https://www.googleapis.com/calendar/v3 (niente googleapis SDK).
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_CALENDAR_PRIMARY = "primary";

export const APP_EXTENDED_PROPERTY_KEY = "app";
export const APP_EXTENDED_PROPERTY_VALUE = "todoist";
export const APP_EXTENDED_PROPERTY_TASK_ID = "taskId";

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
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: "confirmed" | "tentative" | "cancelled";
  updated?: string;
  eventType?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
};

export type GoogleEventsListResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type GoogleWatchChannel = {
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
};

export type EventInput = {
  summary: string;
  description?: string;
  startIso: string;
  endIso?: string;
  cancelled?: boolean;
  taskId?: string;
};

export type MappedTaskFields = {
  title: string;
  descriptionMarkdown: string | null;
  scheduledAt: Date;
  estimatedMinutes: number | null;
  completedAt: Date | null;
};

export class GoogleSyncTokenExpiredError extends Error {
  constructor() {
    super("Google Calendar sync token expired");
    this.name = "GoogleSyncTokenExpiredError";
  }
}

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

export function isAppOriginatedEvent(event: GoogleEvent): boolean {
  const priv = event.extendedProperties?.private;
  return priv?.[APP_EXTENDED_PROPERTY_KEY] === APP_EXTENDED_PROPERTY_VALUE;
}

export function shouldImportGoogleEvent(event: GoogleEvent): boolean {
  if (isAppOriginatedEvent(event)) return false;
  if (event.eventType && event.eventType !== "default") return false;
  if (!event.start?.dateTime) return false;
  return true;
}

export function isGoogleEventInPast(
  event: GoogleEvent,
  now: Date = new Date(),
): boolean {
  const cutoffIso = event.end?.dateTime ?? event.start?.dateTime;
  if (!cutoffIso) return false;
  return new Date(cutoffIso).getTime() < now.getTime();
}

export function parseGoogleUpdatedAt(event: GoogleEvent): Date {
  if (event.updated) return new Date(event.updated);
  return new Date();
}

export function mapGoogleEventToTaskFields(event: GoogleEvent): MappedTaskFields | null {
  if (!shouldImportGoogleEvent(event)) return null;
  const startIso = event.start.dateTime;
  if (!startIso) return null;

  const scheduledAt = new Date(startIso);
  let estimatedMinutes: number | null = null;
  const endIso = event.end?.dateTime;
  if (endIso) {
    const end = new Date(endIso);
    const mins = Math.round((end.getTime() - scheduledAt.getTime()) / 60_000);
    if (mins > 0 && mins <= 60 * 24 * 30) estimatedMinutes = mins;
  }

  return {
    title: event.summary?.trim() || "(Senza titolo)",
    descriptionMarkdown: event.description ?? null,
    scheduledAt,
    estimatedMinutes,
    completedAt: event.status === "cancelled" ? new Date() : null,
  };
}

function eventBody(input: EventInput) {
  const end =
    input.endIso ??
    new Date(new Date(input.startIso).getTime() + 60 * 60_000).toISOString();
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso },
    end: { dateTime: end },
    status: input.cancelled ? "cancelled" : "confirmed",
  };
  if (input.taskId) {
    body.extendedProperties = {
      private: {
        [APP_EXTENDED_PROPERTY_KEY]: APP_EXTENDED_PROPERTY_VALUE,
        [APP_EXTENDED_PROPERTY_TASK_ID]: input.taskId,
      },
    };
  }
  return body;
}

export async function insertEvent(opts: {
  accessToken: string;
  event: EventInput;
}): Promise<GoogleEvent> {
  const res = await fetch(
    `${CAL_BASE}/calendars/${GOOGLE_CALENDAR_PRIMARY}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody(opts.event)),
    },
  );
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
    `${CAL_BASE}/calendars/${GOOGLE_CALENDAR_PRIMARY}/events/${encodeURIComponent(opts.eventId)}`,
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
    `${CAL_BASE}/calendars/${GOOGLE_CALENDAR_PRIMARY}/events/${encodeURIComponent(opts.eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${opts.accessToken}` },
    },
  );
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google deleteEvent failed: ${res.status} ${await res.text()}`);
  }
}

export async function listEventsIncremental(opts: {
  accessToken: string;
  syncToken?: string | null;
  pageToken?: string | null;
}): Promise<GoogleEventsListResponse> {
  const params = new URLSearchParams({
    showDeleted: "true",
    singleEvents: "true",
    maxResults: "250",
  });

  if (opts.syncToken) {
    params.set("syncToken", opts.syncToken);
  } else {
    params.append("eventTypes", "default");
    params.set("timeMin", new Date().toISOString());
  }

  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  const url = `${CAL_BASE}/calendars/${GOOGLE_CALENDAR_PRIMARY}/events?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.accessToken}` },
  });

  if (res.status === 410) {
    throw new GoogleSyncTokenExpiredError();
  }
  if (!res.ok) {
    throw new Error(`Google listEvents failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleEventsListResponse;
}

export async function watchEvents(opts: {
  accessToken: string;
  channelId: string;
  address: string;
  token: string;
  ttlSeconds?: number;
}): Promise<GoogleWatchChannel> {
  const res = await fetch(
    `${CAL_BASE}/calendars/${GOOGLE_CALENDAR_PRIMARY}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: opts.channelId,
        type: "web_hook",
        address: opts.address,
        token: opts.token,
        params: { ttl: String(opts.ttlSeconds ?? 86400) },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Google watchEvents failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleWatchChannel;
}

export async function stopWatchChannel(opts: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const res = await fetch(`${CAL_BASE}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: opts.channelId,
      resourceId: opts.resourceId,
    }),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Google stopChannel failed: ${res.status} ${await res.text()}`);
  }
}

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

/**
 * Base URL pubblico dell'app, usato per costruire i redirect_uri OAuth.
 *
 * NON derivarlo da `req.url`: dietro un proxy o quando il dev server è esposto
 * su 0.0.0.0 l'host della richiesta finisce nel redirect_uri e Google lo rifiuta
 * (`Error 400: invalid_request` — host non-loopback / schema insicuro).
 *
 * Fonte canonica: `BETTER_AUTH_URL` (come `resolveAuthURL` in lib/auth/config.ts),
 * così login e Calendar OAuth puntano allo stesso dominio. In produzione la var è
 * obbligatoria; in dev fallback a localhost. Ritorna senza slash finale.
 */
export function resolveAppBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL?.trim();
  if (url) return url.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_URL mancante in produzione: imposta il dominio pubblico " +
        "(es. https://tempist.app), altrimenti i redirect_uri OAuth puntano a localhost.",
    );
  }
  return "http://localhost:3000";
}

/** Redirect URI registrato su Google Cloud Console per il callback Calendar. */
export function resolveCalendarRedirectUri(): string {
  return `${resolveAppBaseUrl()}/api/integrations/google-calendar/callback`;
}

export function resolveCalendarWebhookUrl(): string | null {
  // Override esplicito utile in dev (es. URL ngrok raggiungibile da Google).
  const explicit = process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Stessa fonte del redirect OAuth. Google non può raggiungere localhost:
  // in quel caso ritorna null così il caller salta la registrazione del watch.
  const base = resolveAppBaseUrl();
  if (base.includes("localhost") || base.includes("127.0.0.1")) return null;
  return `${base}/api/integrations/google-calendar/webhook`;
}

import { NextResponse } from "next/server";

import { findAccountByWatchChannel } from "@/lib/domain/calendar-pull";
import { getBoss } from "@/lib/jobs/boss";
import { CALENDAR_SYNC_QUEUE } from "@/lib/jobs/definitions/calendar-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceId = req.headers.get("x-goog-resource-id");
  const channelToken = req.headers.get("x-goog-channel-token");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (!channelId || !resourceId) {
    return new NextResponse(null, { status: 400 });
  }

  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  const account = await findAccountByWatchChannel({
    channelId,
    resourceId,
  });

  if (!account) {
    return new NextResponse(null, { status: 404 });
  }

  if (
    account.watchWebhookToken &&
    channelToken !== account.watchWebhookToken
  ) {
    return new NextResponse(null, { status: 403 });
  }

  const boss = await getBoss();
  await boss.send(CALENDAR_SYNC_QUEUE, {
    accountId: account.id,
    tickAt: new Date().toISOString(),
  });

  return new NextResponse(null, { status: 200 });
}

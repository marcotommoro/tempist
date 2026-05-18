import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getRunningTimer } from "@/lib/domain/time-entries";
import { TimerWidgetClient } from "./timer-widget-client";

/**
 * Server Component wrapper — fetcha il running timer e passa al client.
 * Renderizzato nel topbar layout, è async e si revalida con revalidatePath("/", "layout").
 */
export async function TimerWidget() {
  const { user, organizationId } = await requireActiveOrganization();
  const running = await getRunningTimer({ userId: user.id, organizationId });
  return <TimerWidgetClient running={running} />;
}

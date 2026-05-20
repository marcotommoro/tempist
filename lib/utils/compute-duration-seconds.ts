export function computeDurationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

export function validateTimeEntryRange(startedAt: Date, endedAt: Date): void {
  if (endedAt.getTime() <= startedAt.getTime()) {
    throw new Error("endedAt deve essere > startedAt");
  }
}

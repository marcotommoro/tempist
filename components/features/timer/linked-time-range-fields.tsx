"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LinkedTimeRangeFields({
  startTime,
  endTime,
  durationText,
  onStartChange,
  onEndChange,
  onDurationChange,
  onDurationBlur,
  disabled,
  startId = "time-start",
  endId = "time-end",
  durationId = "time-duration",
}: {
  startTime: string;
  endTime: string;
  durationText: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onDurationBlur?: () => void;
  disabled?: boolean;
  startId?: string;
  endId?: string;
  durationId?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label htmlFor={startId}>Ora inizio</Label>
        <Input
          id={startId}
          type="time"
          value={startTime}
          onChange={(e) => onStartChange(e.target.value)}
          step={60}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor={endId}>Ora fine</Label>
        <Input
          id={endId}
          type="time"
          value={endTime}
          onChange={(e) => onEndChange(e.target.value)}
          step={60}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor={durationId}>Ore effettive</Label>
        <Input
          id={durationId}
          type="text"
          inputMode="text"
          value={durationText}
          onChange={(e) => onDurationChange(e.target.value)}
          onBlur={onDurationBlur}
          placeholder="es. 2 o 1h30"
          required
          disabled={disabled}
          className="font-mono tabular-nums"
        />
      </div>
    </div>
  );
}

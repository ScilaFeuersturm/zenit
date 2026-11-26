import React from "react";
import { colors, radius, spacing } from "@/constants/theme";
import { displayDate } from "./eventDateTime";
import type { EventDateTimeProps } from "./eventDateTime";

const inputStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  color: colors.textPrimary,
  colorScheme: "dark",
  font: "inherit",
  fontSize: 15,
  padding: spacing.md,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  color: colors.textSecondary,
  fontSize: 13,
  fontWeight: 600,
};

export function EventDateTimeField({ date, time, onDateChange, onTimeChange, disabled }: EventDateTimeProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
      <label style={labelStyle}>
        {date ? `Fecha · ${displayDate(date)}` : "Fecha (DD/MM/AAAA)"}
        <input lang="es-AR" type="date" value={date} disabled={disabled} style={inputStyle} onChange={(event) => onDateChange(event.currentTarget.value)} />
      </label>
      <label style={labelStyle}>
        Hora local
        <input lang="es-AR" type="time" value={time} disabled={disabled} style={inputStyle} onChange={(event) => onTimeChange(event.currentTarget.value)} />
      </label>
    </div>
  );
}

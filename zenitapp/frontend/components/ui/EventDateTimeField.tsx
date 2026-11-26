import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/theme";
import { combineLocalDateTime, displayDate, localDateValue, localTimeValue } from "./eventDateTime";
import type { EventDateTimeProps } from "./eventDateTime";

export function EventDateTimeField({ date, time, onDateChange, onTimeChange, disabled }: EventDateTimeProps) {
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const [draft, setDraft] = useState(new Date());

  function open(nextMode: "date" | "time") {
    const now = new Date();
    setDraft(combineLocalDateTime(date || localDateValue(now), time || localTimeValue(now)) ?? now);
    setMode(nextMode);
  }

  function commit(value: Date) {
    if (mode === "date") onDateChange(localDateValue(value));
    if (mode === "time") onTimeChange(localTimeValue(value));
    setMode(null);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Fecha y hora local</Text>
      <View style={styles.actions}>
        <Button label={date ? `Fecha ${displayDate(date)}` : "Elegir fecha"} variant="outline" disabled={disabled} onPress={() => open("date")} />
        <Button label={time ? `Hora ${time}` : "Elegir hora"} variant="outline" disabled={disabled} onPress={() => open("time")} />
      </View>
      {mode && (
        <>
          <DateTimePicker
            key={mode}
            value={draft}
            mode={mode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            locale="es-AR"
            is24Hour
            onChange={(event, value) => {
              if (Platform.OS === "ios") {
                if (value) setDraft(value);
              } else if (event.type === "set" && value) {
                commit(value);
              } else {
                setMode(null);
              }
            }}
          />
          {Platform.OS === "ios" && (
            <View style={styles.actions}>
              <Button label="Cancelar" variant="outline" onPress={() => setMode(null)} />
              <Button label="Aplicar" onPress={() => commit(draft)} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md, gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});

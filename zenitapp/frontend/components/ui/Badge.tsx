import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, statusColors } from "@/constants/theme";

const LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  confirmado: "Confirmado",
  rechazada: "Rechazada",
  modificada: "Modificada",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}26`, borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

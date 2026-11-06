import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { QuoteRequest, QuoteRequestStatus } from "@/types";

export default function RequestsScreen() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<QuoteRequest[]>("/api/quotes");
      setQuotes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function updateStatus(id: number, status: QuoteRequestStatus) {
    setBusyId(id);
    try {
      await api.patch(`/api/quotes/${id}/status`, { status });
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Solicitudes de presupuesto</Text>
      <FlatList
        data={quotes}
        keyExtractor={(q) => String(q.id)}
        contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.sm }}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay solicitudes todavía.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.clientName}>Cliente #{item.client_id}</Text>
              <StatusBadge status={item.status} />
            </View>

            {item.items.map((qi) => (
              <Text key={qi.id} style={styles.itemLine}>
                • {qi.service?.name ?? `Servicio #${qi.service_id}`} × {qi.quantity}
              </Text>
            ))}

            {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}

            <Text style={styles.total}>Total estimado: ${item.estimated_total.toLocaleString("es-AR")}</Text>

            {item.status === "pendiente" && (
              <View style={styles.actions}>
                <Button
                  label="Aprobar"
                  onPress={() => updateStatus(item.id, "aprobada")}
                  loading={busyId === item.id}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Rechazar"
                  variant="danger"
                  onPress={() => updateStatus(item.id, "rechazada")}
                  loading={busyId === item.id}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  clientName: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  itemLine: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  message: { color: colors.textMuted, fontStyle: "italic", fontSize: 13, marginTop: spacing.xs },
  total: { color: colors.accent, fontWeight: "700", marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xl },
});

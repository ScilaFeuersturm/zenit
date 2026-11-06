import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { EventStatus, ZenitEvent } from "@/types";

const FILTERS: { key: EventStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "en_curso", label: "En curso" },
  { key: "finalizado", label: "Finalizados" },
];

export default function OperationsScreen() {
  const [events, setEvents] = useState<ZenitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventStatus | "todos">("todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ZenitEvent[]>("/api/events");
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = filter === "todos" ? events : events.filter((e) => e.status === filter);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Operación &amp; Logística</Text>
      <Text style={styles.subtitle}>Asigná personal, controlá equipos y actualizá estados</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos en este filtro.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/(admin)/event/${item.id}`)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMeta}>
                {new Date(item.event_date).toLocaleDateString("es-AR")} · {item.staff_assignments.length} asignado(s)
              </Text>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 15, flex: 1, marginRight: spacing.sm },
  cardMeta: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xl },
});

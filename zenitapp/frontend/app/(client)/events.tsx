import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { QuoteRequest, ZenitEvent } from "@/types";

type TimelineEntry =
  | { kind: "event"; date: string; data: ZenitEvent }
  | { kind: "quote"; date: string; data: QuoteRequest };

export default function MyEventsScreen() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [events, quotes] = await Promise.all([
        api.get<ZenitEvent[]>("/api/events/mine"),
        api.get<QuoteRequest[]>("/api/quotes/mine"),
      ]);

      const eventQuoteIds = new Set(events.map((e) => e.id));
      const merged: TimelineEntry[] = [
        ...events.map((e) => ({ kind: "event" as const, date: e.event_date ?? e.created_at, data: e })),
        // Solo mostramos solicitudes que todavía no derivaron en un evento (pendientes/rechazadas)
        ...quotes
          .filter((q) => q.status !== "aprobada")
          .map((q) => ({ kind: "quote" as const, date: q.created_at, data: q })),
      ];
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Mis Eventos</Text>
      <Text style={styles.subtitle}>Seguí el estado de tus contrataciones y solicitudes</Text>

      <FlatList
        data={entries}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.md }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Todavía no tenés eventos ni solicitudes.</Text>
            <Text style={styles.emptyHint}>Armá tu presupuesto desde la pestaña Catálogo.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "event") {
            const event = item.data;
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(client)/event/${event.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <StatusBadge status={event.status} />
                </View>
                <Text style={styles.cardMeta}>
                  {new Date(event.event_date).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  {event.location ? ` · ${event.location}` : ""}
                </Text>
                <Text style={styles.cardAmount}>${event.total_amount.toLocaleString("es-AR")}</Text>
              </Pressable>
            );
          }

          const quote = item.data;
          return (
            <View style={[styles.card, { opacity: 0.85 }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Solicitud de presupuesto</Text>
                <StatusBadge status={quote.status} />
              </View>
              <Text style={styles.cardMeta}>
                {quote.items.length} servicio(s) · ${quote.estimated_total.toLocaleString("es-AR")}
              </Text>
              {quote.admin_notes ? (
                <Text style={styles.adminNotes}>"{quote.admin_notes}"</Text>
              ) : null}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", flex: 1, marginRight: spacing.sm },
  cardMeta: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  cardAmount: { color: colors.accent, fontSize: 15, fontWeight: "700", marginTop: spacing.xs },
  adminNotes: { color: colors.textMuted, fontStyle: "italic", fontSize: 12, marginTop: spacing.xs },
  empty: { alignItems: "center", marginTop: spacing.xl * 2 },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  emptyHint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});

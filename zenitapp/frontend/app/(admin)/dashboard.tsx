import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useZenitSocket } from "@/hooks/useZenitSocket";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { AppNotification, QuoteRequest, ZenitEvent } from "@/types";

const NOTIF_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  nueva_solicitud: "document-text",
  nuevo_mensaje: "chatbubble-ellipses",
  evento_actualizado: "calendar",
  asignacion_personal: "people",
  "reseña_recibida": "star",
};

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [pendingQuotes, setPendingQuotes] = useState<QuoteRequest[]>([]);
  const [activeEvents, setActiveEvents] = useState<ZenitEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    const [quotes, events, notifs] = await Promise.all([
      api.get<QuoteRequest[]>("/api/quotes?status_filter=pendiente"),
      api.get<ZenitEvent[]>("/api/events"),
      api.get<AppNotification[]>("/api/notifications?only_unread=true"),
    ]);
    setPendingQuotes(quotes);
    setActiveEvents(events.filter((e) => e.status === "en_curso" || e.status === "confirmado"));
    setNotifications(notifs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useZenitSocket(
    (msg) => {
      if (msg.event === "notification") load();
    },
    !!user
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.full_name?.split(" ")[0]} 👋</Text>
        <Text style={styles.subtitle}>Así está la operación de Zenit hoy</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Solicitudes pendientes" value={pendingQuotes.length} color={colors.warning} onPress={() => router.push("/(admin)/requests")} />
        <StatCard label="Eventos activos" value={activeEvents.length} color={colors.success} onPress={() => router.push("/(admin)/operations")} />
      </View>

      <Text style={styles.sectionTitle}>Alertas recientes</Text>
      <FlatList
        data={notifications}
        keyExtractor={(n) => String(n.id)}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin novedades por ahora ✨</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.notifCard}
            onPress={async () => {
              await api.patch(`/api/notifications/${item.id}/read`);
              setNotifications((prev) => prev.filter((n) => n.id !== item.id));
              if (item.type === "nuevo_mensaje") router.push("/(admin)/chat");
              if (item.type === "nueva_solicitud") router.push("/(admin)/requests");
            }}
          >
            <View style={styles.notifIcon}>
              <Ionicons name={NOTIF_ICONS[item.type] ?? "notifications"} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              {item.body ? (
                <Text style={styles.notifBody} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

function StatCard({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.statCard, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  greeting: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  notifBody: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});

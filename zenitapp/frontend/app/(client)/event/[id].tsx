import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api, ApiError } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { EventStatus, ZenitEvent } from "@/types";

const TIMELINE_STEPS: EventStatus[] = ["pendiente", "confirmado", "en_curso", "finalizado"];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ZenitEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ZenitEvent>(`/api/events/${id}`);
      setEvent(data);
      try {
        await api.get(`/api/events/${id}/review`);
        setReviewSent(true);
      } catch {
        setReviewSent(false);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submitReview() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/events/${id}/review`, { rating, comment: comment || undefined });
      setReviewSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar la reseña");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !event) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  const currentStepIndex = TIMELINE_STEPS.indexOf(event.status);
  const isCancelled = event.status === "cancelado";

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: event.title, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{event.title}</Text>
          <StatusBadge status={event.status} />
        </View>
        <Text style={styles.meta}>
          {new Date(event.event_date).toLocaleDateString("es-AR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </Text>
        {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}

        {!isCancelled && (
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, index) => {
              const done = index <= currentStepIndex;
              return (
                <View key={step} style={styles.timelineRow}>
                  <View style={styles.timelineIndicator}>
                    <View style={[styles.timelineDot, done && styles.timelineDotActive]}>
                      {done && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, done && styles.timelineLineActive]} />
                    )}
                  </View>
                  <Text style={[styles.timelineLabel, done && styles.timelineLabelActive]}>
                    {LABELS[step]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Servicios contratados</Text>
        {event.services.map((es) => (
          <View key={es.id} style={styles.serviceRow}>
            <Text style={styles.serviceName}>
              {es.service?.name ?? `Servicio #${es.service_id}`} × {es.quantity}
            </Text>
            <Text style={styles.servicePrice}>
              ${(es.unit_price * es.quantity).toLocaleString("es-AR")}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${event.total_amount.toLocaleString("es-AR")}</Text>
        </View>

        {event.status === "finalizado" && (
          <View style={styles.reviewBox}>
            {reviewSent ? (
              <Text style={styles.reviewSent}>¡Gracias por tu reseña! 🎉</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>¿Cómo estuvo tu evento?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= rating ? "star" : "star-outline"}
                      size={30}
                      color={colors.accent}
                      onPress={() => setRating(n)}
                      style={{ marginRight: spacing.xs }}
                    />
                  ))}
                </View>
                <TextField
                  label="Comentario (opcional)"
                  placeholder="Contanos tu experiencia..."
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                />
                {error ? <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text> : null}
                <Button label="Enviar reseña" onPress={submitReview} loading={submitting} />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  meta: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  timeline: { marginTop: spacing.lg, marginBottom: spacing.lg },
  timelineRow: { flexDirection: "row", alignItems: "center", minHeight: 40 },
  timelineIndicator: { alignItems: "center", width: 28 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineDotActive: { backgroundColor: colors.success, borderColor: colors.success },
  timelineLine: { width: 2, height: 24, backgroundColor: colors.border },
  timelineLineActive: { backgroundColor: colors.success },
  timelineLabel: { color: colors.textMuted, marginLeft: spacing.sm, fontSize: 14 },
  timelineLabelActive: { color: colors.textPrimary, fontWeight: "600" },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceName: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  servicePrice: { color: colors.textSecondary, fontSize: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
  totalLabel: { color: colors.textSecondary, fontSize: 15 },
  totalValue: { color: colors.accent, fontSize: 20, fontWeight: "800" },
  reviewBox: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  starsRow: { flexDirection: "row", marginBottom: spacing.md },
  reviewSent: { color: colors.success, fontSize: 15, fontWeight: "600", textAlign: "center" },
});

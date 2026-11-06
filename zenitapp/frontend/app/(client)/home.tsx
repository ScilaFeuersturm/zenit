import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { Service } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  catering: "Catering",
  sonido: "Sonido",
  iluminacion: "Iluminación",
  decoracion: "Decoración",
  personal: "Personal",
  mobiliario: "Mobiliario",
  otro: "Otros",
};

type Cart = Record<number, number>; // service_id -> quantity

export default function CatalogScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart>({});
  const [desiredDate, setDesiredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Service[]>("/api/services");
      setServices(data);
    } catch {
      setFeedback("No se pudo cargar el catálogo. Deslizá para reintentar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [loadServices])
  );

  const total = useMemo(
    () =>
      services.reduce((sum, s) => sum + (cart[s.id] ?? 0) * s.unit_price, 0),
    [cart, services]
  );

  const itemCount = useMemo(() => Object.values(cart).filter((q) => q > 0).length, [cart]);

  function updateQty(serviceId: number, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[serviceId] ?? 0) + delta);
      return { ...prev, [serviceId]: next };
    });
  }

  async function submitQuote() {
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([serviceId, quantity]) => ({ service_id: Number(serviceId), quantity }));

    if (items.length === 0) {
      setFeedback("Elegí al menos un servicio para pedir presupuesto");
      return;
    }

    const parsedDate = new Date(desiredDate);
    if (!desiredDate || Number.isNaN(parsedDate.getTime())) {
      setFeedback("Ingresá la fecha del evento (AAAA-MM-DD)");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post("/api/quotes", { items, desired_date: parsedDate.toISOString() });
      setCart({});
      setDesiredDate("");
      setFeedback("¡Listo! Tu solicitud de presupuesto fue enviada. Te avisamos por chat.");
    } catch (e) {
      setFeedback(e instanceof ApiError ? e.message : "No se pudo enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const service of services) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return Array.from(map.entries());
  }, [services]);

  return (
    <ScreenContainer style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Armá tu evento</Text>
        <Text style={styles.subtitle}>Elegí servicios y pedí tu presupuesto en minutos</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([category]) => category}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}
          renderItem={({ item: [category, items] }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category] ?? category}</Text>
              {items.map((service) => (
                <View key={service.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description ? (
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {service.description}
                      </Text>
                    ) : null}
                    <Text style={styles.servicePrice}>
                      ${service.unit_price.toLocaleString("es-AR")} · {service.price_unit.replace("_", " ")}
                    </Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(service.id, -1)}>
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.qtyValue}>{cart[service.id] ?? 0}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(service.id, 1)}>
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {feedback ? (
        <View style={styles.feedbackBar}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      {itemCount > 0 && (
        <View style={styles.footer}>
          <TextInput
            value={desiredDate}
            onChangeText={setDesiredDate}
            placeholder="Fecha del evento (AAAA-MM-DD)"
            placeholderTextColor={colors.textMuted}
            style={styles.dateInput}
          />
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>{itemCount} servicio(s) seleccionados</Text>
              <Text style={styles.footerTotal}>${total.toLocaleString("es-AR")}</Text>
            </View>
            <Button label="Pedir presupuesto" onPress={submitQuote} loading={submitting} />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  categoryTitle: {
    ...typography.h3,
    color: colors.accent,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    fontSize: 13,
    letterSpacing: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  serviceDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  servicePrice: { color: colors.accent, fontSize: 13, marginTop: 6, fontWeight: "600" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginLeft: spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { color: colors.textPrimary, fontWeight: "700", minWidth: 16, textAlign: "center" },
  feedbackBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
  },
  feedbackText: { color: colors.textPrimary, fontSize: 13, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  dateInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 13,
  },
  footerLabel: { color: colors.textSecondary, fontSize: 12 },
  footerTotal: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
});

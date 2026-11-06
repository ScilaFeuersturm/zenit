import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { Service, ServiceCategory } from "@/types";

const CATEGORIES: ServiceCategory[] = [
  "catering",
  "sonido",
  "iluminacion",
  "decoracion",
  "personal",
  "mobiliario",
  "otro",
];

export default function ServicesAdminScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("catering");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Service[]>("/api/services?only_active=false");
      setServices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function createService() {
    if (!name || !price) return;
    setSaving(true);
    try {
      await api.post("/api/services", {
        name,
        category,
        unit_price: Number(price),
        stock_total: Number(stock) || 1,
        price_unit: "por_evento",
      });
      setName("");
      setPrice("");
      setStock("1");
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: Service) {
    await api.patch(`/api/services/${service.id}`, { is_active: !service.is_active });
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Servicios e Inventario</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm((v) => !v)}>
          <Ionicons name={showForm ? "close" : "add"} size={20} color={colors.white} />
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Sonido profesional" />
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.categoryChip, category === c && styles.categoryChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField label="Precio unitario" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextField label="Stock disponible" value={stock} onChangeText={setStock} keyboardType="numeric" />
          <Button label="Guardar servicio" onPress={createService} loading={saving} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.sm }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, !item.is_active && styles.inactiveText]}>{item.name}</Text>
                <Text style={styles.serviceMeta}>
                  {item.category} · ${item.unit_price.toLocaleString("es-AR")} · Stock: {item.stock_total}
                </Text>
              </View>
              <Switch
                value={item.is_active}
                onValueChange={() => toggleActive(item)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { color: colors.textSecondary, fontSize: 11 },
  categoryChipTextActive: { color: colors.white, fontWeight: "700" },
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
  serviceName: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  inactiveText: { color: colors.textMuted, textDecorationLine: "line-through" },
  serviceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});

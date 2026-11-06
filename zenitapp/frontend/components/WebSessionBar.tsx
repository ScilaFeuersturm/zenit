import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

export function WebSessionBar() {
  const { user, signOut } = useAuth();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");

  if (Platform.OS !== "web" || !user) return null;

  async function closeSession() {
    if (closing) return;
    setClosing(true);
    setError("");
    try {
      await signOut();
      router.replace("/");
    } catch {
      setError("No se pudo cerrar la sesión. Volvé a intentarlo.");
      setClosing(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <View style={styles.identity}>
          <Text style={styles.brand}>ZENIT</Text>
          <Text style={styles.name} numberOfLines={1}>{user.full_name}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" disabled={closing} onPress={() => void closeSession()} style={({ pressed }) => [styles.button, (pressed || closing) && { opacity: 0.65 }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.accent} />
          <Text style={styles.label}>{closing ? "Cerrando…" : "Cerrar sesión"}</Text>
        </Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  bar: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, gap: 16 },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 18 },
  brand: { color: colors.accent, fontSize: 18, letterSpacing: 3, fontWeight: "600" },
  name: { flexShrink: 1, color: colors.textSecondary, fontSize: 13 },
  button: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  label: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 24, paddingBottom: 10 },
});

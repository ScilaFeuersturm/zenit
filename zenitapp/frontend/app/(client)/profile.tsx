import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing, typography } from "@/constants/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{user?.full_name?.[0]?.toUpperCase() ?? "Z"}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="call" label="Teléfono" value={user?.phone ?? "No cargado"} />
        <InfoRow icon="shield-checkmark" label="Rol" value="Cliente" />
      </View>

      <Button label="Cerrar sesión" onPress={handleLogout} variant="outline" style={{ marginTop: spacing.xl }} />
    </ScreenContainer>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarLetter: { color: colors.white, fontSize: 36, fontWeight: "800" },
  name: { ...typography.h2, color: colors.textPrimary },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
});

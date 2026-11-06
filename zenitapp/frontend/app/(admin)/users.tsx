import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { User } from "@/types";

export default function UsersScreen() {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "empleado">("empleado");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [listError, setListError] = useState("");

  const load = useCallback(async () => {
    if (user?.role !== "admin") return;
    setListError("");
    try {
      const rows = await api.get<User[]>("/api/users");
      setMembers(rows.filter((member) => member.role !== "cliente"));
    } catch {
      setListError("No pudimos cargar el equipo. Intentá nuevamente.");
    } finally { setLoading(false); }
  }, [user?.role]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function createMember() {
    if (saving) return;
    setError(""); setSuccess("");
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      setError("Completá el nombre, un email válido y una contraseña de al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const member = await api.post<User>("/api/users/staff", {
        full_name: name.trim(), email: email.trim().toLowerCase(), password, role,
      });
      setMembers((previous) => [...previous, member].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setName(""); setEmail(""); setPassword(""); setRole("empleado");
      setSuccess(`Cuenta de ${member.role === "admin" ? "administrador" : "empleado"} creada. Ya puede iniciar sesión.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la cuenta.");
    } finally { setSaving(false); }
  }

  if (user?.role !== "admin") return <Redirect href="/(admin)/dashboard" />;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Equipo Zenit</Text>
        <Text style={styles.description}>Creá cuentas de administradores o empleados para tu equipo.</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nueva cuenta</Text>
          <TextField label="Nombre completo" accessibilityLabel="Nombre completo" value={name} onChangeText={setName} editable={!saving} />
          <TextField label="Email" accessibilityLabel="Email del nuevo usuario" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!saving} />
          <TextField label="Contraseña inicial" accessibilityLabel="Contraseña inicial" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!saving} />
          <Text style={styles.label}>Permisos de la cuenta</Text>
          <View style={styles.roles}>
            {(["empleado", "admin"] as const).map((option) => (
              <Pressable key={option} onPress={() => setRole(option)} disabled={saving} accessibilityRole="button" accessibilityState={{ selected: role === option }} style={[styles.role, role === option && styles.roleSelected]}>
                <Text style={role === option ? styles.gold : styles.description}>{option === "admin" ? "Administrador" : "Empleado"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.permission}>{role === "admin" ? "Este usuario tendrá acceso al panel completo y podrá crear otros administradores." : "Este usuario podrá acceder a las funciones operativas, sin crear cuentas del equipo."}</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
          <Button label="Crear usuario" loading={saving} onPress={() => void createMember()} />
        </View>
        <Text style={styles.sectionTitle}>Cuentas del equipo</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {listError ? <View><Text style={styles.error}>{listError}</Text><Button label="Reintentar" variant="outline" onPress={() => void load()} /></View> : null}
        {members.map((member) => <View key={member.id} style={styles.member}><View style={{ flex: 1 }}><Text style={styles.memberName}>{member.full_name}{member.id === user.id ? " (vos)" : ""}</Text><Text style={styles.memberEmail}>{member.email}</Text></View><Text style={styles.badge}>{member.role === "admin" ? "Admin" : "Empleado"}</Text></View>)}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.lg, paddingBottom: 40, gap: spacing.md, maxWidth: 720, width: "100%", alignSelf: "center" },
  title: { ...typography.h1, color: colors.textPrimary },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  card: { padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, gap: 6 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  roles: { flexDirection: "row", gap: 10, marginVertical: 10 },
  role: { flex: 1, alignItems: "center", paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  roleSelected: { borderColor: colors.accent, backgroundColor: colors.surface },
  gold: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  permission: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginBottom: 14 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  success: { color: colors.success, fontSize: 13, marginBottom: 10 },
  member: { flexDirection: "row", gap: 12, alignItems: "center", padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surface },
  memberName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  memberEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  badge: { color: colors.accent, fontSize: 11 },
});

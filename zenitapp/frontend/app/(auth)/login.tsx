import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { brandFont, colors, spacing, typography } from "@/constants/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Ionicons name="sparkles" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.eyebrow}>EVENTOS</Text>
          <Text style={styles.brandTitle}>ZENIT</Text>
          <Text style={styles.brandSubtitle}>Organizamos tu momento. En vivo, sin vueltas.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>
          <Text style={styles.formHint}>
            Usá tu email de cliente o de equipo Zenit — el acceso a tu panel se abre automáticamente.
          </Text>

          <TextField
            label="Email"
            placeholder="vos@ejemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label="Ingresar" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>¿Sos nuevo por acá? </Text>
            <Link href="/(auth)/register">
              <Text style={styles.registerLink}>Creá tu cuenta de cliente</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 4,
  },
  brandTitle: {
    fontFamily: brandFont,
    fontSize: 44,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 6,
    marginTop: 2,
  },
  brandSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
  },
  formTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  formHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    flexWrap: "wrap",
  },
  registerText: { color: colors.textSecondary, fontSize: 13 },
  registerLink: { color: colors.accent, fontSize: 13, fontWeight: "700" },
});

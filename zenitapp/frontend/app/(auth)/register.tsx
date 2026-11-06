import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, typography } from "@/constants/theme";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    if (!fullName || !email || !password) {
      setError("Completá nombre, email y contraseña");
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, full_name: fullName, phone: phone || undefined });
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Para cotizar y seguir tus eventos con Zenit</Text>

        <View style={styles.form}>
          <TextField label="Nombre completo" value={fullName} onChangeText={setFullName} />
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField label="Teléfono (opcional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextField label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />
          <Button label="Volver a iniciar sesión" onPress={() => router.back()} variant="outline" style={{ marginTop: spacing.sm }} />
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
  title: { ...typography.h1, color: colors.textPrimary, textAlign: "center" },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
  },
  errorText: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
});

import React, { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Redirect, router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { ClientForm } from "@/components/ui/ClientForm";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";

export default function NewClientScreen() {
  const { user } = useAuth();
  const [created, setCreated] = useState<User | null>(null);

  if (user?.role !== "admin") return <Redirect href="/(admin)/operations" />;

  return (
    <ScreenContainer>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: spacing.md, gap: spacing.sm }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary }}>Nuevo cliente</Text>
        {created ? (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>
              {created.full_name} ya está registrado.
            </Text>
            <Button label="Crear otro cliente" onPress={() => setCreated(null)} />
            <Button label="Volver a Operación" variant="outline" onPress={() => router.navigate("/(admin)/operations")} />
          </>
        ) : (
          <ClientForm onCreated={setCreated} onCancel={() => router.navigate("/(admin)/operations")} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

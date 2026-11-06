import React, { useEffect } from "react";
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { brandFont, colors } from "@/constants/theme";

const SITE_URL = Constants.expoConfig?.extra?.siteUrl as string | undefined;

export function Welcome() {
  useEffect(() => {
    if (Platform.OS === "web" && SITE_URL) window.location.replace(SITE_URL);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.brand}><Image source={require("../assets/icon.png")} style={styles.logo} /><Text style={styles.wordmark}>ZENIT</Text></View>
        <Text style={styles.eyebrow}>EXPERIENCIAS CON IDENTIDAD</Text>
        <Text style={styles.title}>Hay momentos{"\n"}que <Text style={styles.gold}>se quedan.</Text></Text>
        <Text style={styles.description}>Personalización, autenticidad y atención a cada detalle. En Zenit acompañamos tus ideas para crear experiencias que conecten a las personas.</Text>
        <Button label="Ingresar a mi cuenta" onPress={() => router.push("/(auth)/login")} />
        <Button label="Crear una cuenta" variant="outline" onPress={() => router.push("/(auth)/register")} />
        <View style={styles.details}><Text style={styles.subtitle}>El universo Zenit</Text>{["Recuerdos en imágenes", "Experiencias para compartir", "Detalles con tu identidad"].map((label) => <Text style={styles.detail} key={label}>✧  {label}</Text>)}</View>
        <Button label="Conocer más sobre Zenit ↗" variant="secondary" onPress={() => Linking.openURL(SITE_URL || "https://www.instagram.com/zenit_organizacioneventos/")} />
        <Text style={styles.footer}>Tu idea. Nuestra atención a cada detalle.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 28, paddingBottom: 45, gap: 16, maxWidth: 560, width: "100%", alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 25 },
  logo: { width: 55, height: 55 },
  wordmark: { fontFamily: brandFont, fontSize: 28, letterSpacing: 6, color: colors.textPrimary },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: colors.accent },
  title: { fontFamily: brandFont, fontSize: 43, lineHeight: 53, color: colors.textPrimary },
  gold: { color: colors.accent, fontStyle: "italic" },
  description: { fontSize: 15, lineHeight: 25, color: colors.textSecondary, marginBottom: 12 },
  details: { marginVertical: 15, paddingVertical: 25, borderTopWidth: 1, borderColor: colors.border, gap: 15 },
  subtitle: { fontFamily: brandFont, fontSize: 24, color: colors.textPrimary },
  detail: { fontSize: 14, color: colors.accent },
  footer: { marginTop: 10, fontSize: 11, textAlign: "center", color: colors.textMuted },
});

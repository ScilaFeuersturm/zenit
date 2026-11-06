import { Platform } from "react-native";

/**
 * Paleta "Zenit": negro + dorado, tomada del logo real de la marca
 * (tipografía serif blanca + estallido de fuegos artificiales dorado sobre
 * fondo negro). El violeta de una versión anterior de este archivo era un
 * placeholder genérico — esta ya refleja la identidad visual real.
 */
export const colors = {
  background: "#0A0A0A",
  surface: "#171412",
  surfaceAlt: "#221E19",
  primary: "#C6892E",
  primaryDark: "#A66F22",
  accent: "#F2B75C",
  success: "#3FCF8E",
  warning: "#E0A63E",
  danger: "#E5605A",
  info: "#5CA6D9",
  textPrimary: "#FFFFFF",
  textSecondary: "#C9C4BC",
  textMuted: "#8C877E",
  border: "#2C2822",
  white: "#FFFFFF",
};

export const statusColors: Record<string, string> = {
  pendiente: colors.warning,
  aprobada: colors.success,
  confirmado: colors.success,
  rechazada: colors.danger,
  modificada: colors.info,
  en_curso: colors.info,
  finalizado: colors.textMuted,
  cancelado: colors.danger,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

/** Serif elegante para reflejar la tipografía del logo (títulos de marca puntuales). */
export const brandFont = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};

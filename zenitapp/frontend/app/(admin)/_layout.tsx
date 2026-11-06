import React from "react";
import { Platform, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";
import { WebSessionBar } from "@/components/WebSessionBar";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href={Platform.OS === "web" ? "/" : "/(auth)/login"} />;
  if (user.role === "cliente") return <Redirect href="/(client)/home" />;

  return (
    <View style={{ flex: 1 }}>
      <WebSessionBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Resumen",
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: "Solicitudes",
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="operations"
          options={{
            title: "Operación",
            tabBarIcon: ({ color, size }) => <Ionicons name="construct" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: "Servicios",
            tabBarIcon: ({ color, size }) => <Ionicons name="pricetags" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Chats",
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="chat/[conversationId]" options={{ href: null }} />
        <Tabs.Screen
          name="users"
          options={{
            title: "Equipo",
            href: user.role === "admin" ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="event/[id]" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

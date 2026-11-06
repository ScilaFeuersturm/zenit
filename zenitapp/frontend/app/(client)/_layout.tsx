import React from "react";
import { Platform, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";
import { WebSessionBar } from "@/components/WebSessionBar";

export default function ClientLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href={Platform.OS === "web" ? "/" : "/(auth)/login"} />;
  if (user.role !== "cliente") return <Redirect href="/(admin)/dashboard" />;

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
          name="home"
          options={{
            title: "Catálogo",
            tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Mis Eventos",
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="event/[id]" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

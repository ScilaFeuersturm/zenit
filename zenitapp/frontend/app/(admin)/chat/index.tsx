import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useZenitSocket } from "@/hooks/useZenitSocket";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { ConversationSummary } from "@/types";

export default function AdminConversationsScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ConversationSummary[]>("/api/chat/conversations");
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useZenitSocket(
    (msg) => {
      if (msg.event === "chat_message") load();
    },
    !!user
  );

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Chats con clientes</Text>
      <FlatList
        data={conversations}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.sm }}
        ListEmptyComponent={<Text style={styles.emptyText}>Todavía no hay conversaciones.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(admin)/chat/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{item.client_name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{item.client_name}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.last_message ?? "Sin mensajes todavía"}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: colors.white, fontWeight: "700", fontSize: 18 },
  clientName: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
  lastMessage: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: colors.background, fontSize: 11, fontWeight: "800" },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xl },
});

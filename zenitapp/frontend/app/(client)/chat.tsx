import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useZenitSocket } from "@/hooks/useZenitSocket";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { ChatMessage, Conversation } from "@/types";

export default function ClientChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const conversation = await api.get<Conversation>("/api/chat/mine");
      setMessages(conversation.messages);
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
      if (msg.event === "chat_message") {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.data.id,
            conversation_id: msg.data.conversation_id,
            sender_id: msg.data.sender_id,
            content: msg.data.content,
            is_read: false,
            created_at: msg.data.created_at,
          },
        ]);
      }
    },
    !!user
  );

  async function sendMessage() {
    const content = text.trim();
    if (!content) return;
    setText("");
    setSending(true);
    try {
      const message = await api.post<ChatMessage>("/api/chat/mine/messages", { content });
      setMessages((prev) => [...prev, message]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <ScreenContainer style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="storefront" size={20} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Eventos Zenit</Text>
          <Text style={styles.headerSubtitle}>Te respondemos a la brevedad</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Escribinos si tenés dudas sobre tu evento o el catálogo 👋
            </Text>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribí un mensaje..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  headerSubtitle: { color: colors.textMuted, fontSize: 12 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", borderRadius: radius.md, padding: spacing.sm },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: colors.white, fontSize: 14 },
  bubbleTextTheirs: { color: colors.textPrimary, fontSize: 14 },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

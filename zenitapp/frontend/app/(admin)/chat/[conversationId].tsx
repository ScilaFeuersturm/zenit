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
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useZenitSocket } from "@/hooks/useZenitSocket";
import { colors, radius, spacing } from "@/constants/theme";
import type { ChatMessage, Conversation } from "@/types";

export default function AdminConversationThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Conversation>(`/api/chat/conversations/${conversationId}`);
      setConversation(data);
      setMessages(data.messages);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useZenitSocket(
    (msg) => {
      if (msg.event === "chat_message" && msg.data.conversation_id === Number(conversationId)) {
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
    const message = await api.post<ChatMessage>(`/api/chat/conversations/${conversationId}/messages`, {
      content,
    });
    setMessages((prev) => [...prev, message]);
  }

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (loading || !conversation) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ paddingHorizontal: 0 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Cliente #${conversation.client_id}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
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
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.content}</Text>
              </View>
            </View>
          );
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Responder al cliente..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", borderRadius: radius.md, padding: spacing.sm },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: colors.white, fontSize: 14 },
  bubbleTextTheirs: { color: colors.textPrimary, fontSize: 14 },
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

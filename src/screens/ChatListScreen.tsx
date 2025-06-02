import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  ChatService,
  UserService,
  ChatData,
  UserData,
  AuthService,
} from "../services/firebase";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../services/ThemeContext";

interface ChatListScreenProps {
  navigation: any;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const { colors, isDarkTheme } = useTheme();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [users, setUsers] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Получение текущего пользователя
  const currentUser = AuthService.getCurrentUser();

  // Reload chats when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadChats = async () => {
        if (!currentUser) return;
        setLoading(true);
        const updatedChats = await ChatService.getUserChats(currentUser.uid);
        if (!isActive) return;
        setChats(updatedChats);
        // Load user data for each chat
        const userIds = new Set<string>();
        updatedChats.forEach((chat) => {
          chat.participants?.forEach((participantId) => {
            if (participantId !== currentUser.uid) {
              userIds.add(participantId);
            }
          });
        });
        const usersData: Record<string, UserData> = {};
        await Promise.all(
          Array.from(userIds).map(async (userId) => {
            const userData = await UserService.getUserData(userId);
            if (userData) {
              usersData[userId] = userData;
            }
          })
        );
        if (!isActive) return;
        setUsers(usersData);
        setLoading(false);
        setRefreshing(false);
      };
      loadChats();
      return () => {
        isActive = false;
      };
    }, [currentUser])
  );

  useEffect(() => {
    if (!currentUser) return;

    // Подписка на обновления чатов
    const unsubscribe = ChatService.onUserChatsUpdate(
      currentUser.uid,
      async (updatedChats) => {
        setChats(updatedChats);

        // Получение данных пользователей для каждого чата
        const userIds = new Set<string>();
        updatedChats.forEach((chat) => {
          chat.participants?.forEach((participantId) => {
            if (participantId !== currentUser.uid) {
              userIds.add(participantId);
            }
          });
        });

        const usersData: Record<string, UserData> = {};
        await Promise.all(
          Array.from(userIds).map(async (userId) => {
            const userData = await UserService.getUserData(userId);
            if (userData) {
              usersData[userId] = userData;
            }
          })
        );

        setUsers(usersData);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Получение данных собеседника
  const getOtherParticipant = (chat: ChatData): UserData | undefined => {
    const otherUserId = chat.participants.find((id) => id !== currentUser?.uid);
    return otherUserId ? users[otherUserId] : undefined;
  };

  // Обработчик нажатия на чат
  const handleChatPress = (chat: ChatData) => {
    const otherUser = getOtherParticipant(chat);
    navigation.navigate("Chat", {
      chatId: chat.id,
      userId: otherUser?.uid,
      userName: otherUser?.displayName || "Пользователь",
    });
  };

  // Обработчик создания нового чата
  const handleNewChat = () => {
    navigation.navigate("AddUser");
  };

  // Обработчик обновления списка чатов
  const handleRefresh = () => {
    setRefreshing(true);
    // Обновление произойдет автоматически через подписку
  };

  // Динамические стили на основе текущей темы
  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#4A86E8",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      overflow: "hidden",
      marginRight: 15,
      borderWidth: 1,
      borderColor: "#eee",
      backgroundColor: "#f5f5f5",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 25,
    },
    avatarText: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold",
    },
    chatInfo: {
      flex: 1,
      marginLeft: 15,
    },
    chatName: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 5,
      color: colors.text,
    },
    lastMessage: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 10,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textSecondary,
      marginBottom: 10,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    newChatButton: {
      position: "absolute",
      bottom: 20,
      right: 20,
      backgroundColor: colors.primary,
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    newChatButtonText: {
      fontSize: 30,
      color: "#ffffff",
      fontWeight: "bold",
    },
  });

  // Рендер элемента чата
  const renderChatItem = ({ item }: { item: ChatData }) => {
    const otherUser = getOtherParticipant(item);
    const hasAvatar = otherUser?.photoURL && otherUser.photoURL.length > 0;

    // Base64 данные для аватара-заглушки
    const avatarPlaceholder =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAD/0lEQVR4nO2dT0gUURzHvzOzs7vr7uparJtgBWGlkXSw9A8dKugYdAm6BJ07BYGHgnJ3t5Abix2CIujkNegyBRZBh7RDWNYhkgJNoVXyddfVXXef/XZm3kzvOZP7Zthvz/f9we/4vnkzvM+bN+/N+71REELAxuPeMH/LNBT7tV+cwLffv8gqWJrdqXJgAVGEBUQRFhBFWEAUYQFRhAVEERYQRVhAFGEBUYQFRBEWEEVYQBRhAVGEBUQRFhBFWEAUYQFRhAVEERYQRVhAFGEBUcTeCyBeuHjL3hhCgo8ApZCRFhV2+d4AEcIrz9/9QLm8BgAgQpBveV/R5/FB1wPouXBCdulS2LU1pFxexdTMMkrLFc/7s21BxGPNiEXD6O3ugKaptpem7OoacnfhKSYmF73trNkQQyCl5QpuD7+QXU5N0ICwPsOUkpIAJSXFzJgFRBGKNUOsIeVKxT7oVXgNsYZYNAw+OCItVzB8A5B1HZqmQvEkbAiJWFS1AdFtU+NtaGlqsB5r9rZ+Pe+PomvgrLQjy4ACIpummrB/n47xF58xPVty9I1cOI7+vk7Z5UmBWjMkGgmh+9xR3B4Zw7uPc+YJQtDS3IDRx7ekS/NCqDVDAOD8mQ4s/PqDiclFa+xsext6uztkl+UZ1FYZayfO1HcW3NBklyQN6g2Z2MKd2+1jAbENQ1fvsZAKiDVGOtVsH3+9mJNdjhQo1hBdCyC5L2yNPeca0tTYYI8hogVrIewuiQVEEdQaMtoawciD63bT4/21Idk1SYFaQADgxPGDUp9fDRQbIRsVKxX7mDdIoWLToLY3dNY0RFxDJiYXUa548wacEqiNEM3qi+32xwOJKO4ODsguTQrUmqGVlTJezRetp8lkS5TaKkt6DWk/uL/2HD4CWpobtv0cwSdIJqJ4mL4qu0QpUOshI6PHrI2dgZH7w2f5GiINai1xHX31AzdH0vj+4w/zJAFikRB0XcOxI3E0RcO4PbKGuYXfjl/XfuB/rAWpE22yS5YGtYAASRT80B1v6KVvDOrvWDQtgHRf0p6Eev95HpMzJTTHwsg8SkNTNfOxeICCT/HR/9uLa3czqKz7nQdRpndJLBqGpjH+Gx7W9pAj8YgNyOz8EqbnnEM4EokinW5HW6xRdqlewhcBMQwD2WzWGkvomgaDAC3NEbtPeJFs3zWojVy1Z/jR/wthxYl32cYCIkpmbKz2JZVG5P6z6pUcXlGtN2SEoRtQfapVi99rw1ZQW0N0XUcqFbOBEFcU4ZZla4YFxIpTC/OhKArSN/pkt1y6Ua0ZIsLg5wzrfCyKdDqJ1lhE9npQL6AYEAJC9n+xpdqz+/tYQBRhAVGE9YZOtX+lLr8Qh6Nj3wAAAABJRU5ErkJggg==";

    return (
      <TouchableOpacity
        style={themedStyles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        {hasAvatar ? (
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: `${otherUser!.photoURL}?cache=${Date.now()}` }}
              style={styles.avatarImage}
              defaultSource={{ uri: avatarPlaceholder }}
            />
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherUser?.displayName?.charAt(0) || "?"}
            </Text>
          </View>
        )}

        <View style={themedStyles.chatInfo}>
          <Text style={themedStyles.chatName}>
            {otherUser?.displayName || "Пользователь"}
          </Text>

          <Text style={themedStyles.lastMessage} numberOfLines={1}>
            {item.lastMessage.type === "image" ? (
              <Text>
                <Text style={{ fontWeight: "bold" }}>🖼️</Text> Изображение
              </Text>
            ) : (
              item.lastMessage.text || "Нет сообщений"
            )}
          </Text>
        </View>

        {item.lastMessage.timestamp && (
          <Text style={themedStyles.timestamp}>
            {new Date(item.lastMessage.timestamp.toDate()).toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" }
            )}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={themedStyles.emptyContainer}>
            <Text style={themedStyles.emptyText}>У вас пока нет чатов</Text>
            <Text style={themedStyles.emptySubtext}>
              Нажмите на кнопку "+" внизу, чтобы начать новый чат
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={themedStyles.newChatButton}
        onPress={handleNewChat}
      >
        <Text style={themedStyles.newChatButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4A86E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f5f5f5",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#4A86E8",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  newChatButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4A86E8",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newChatButtonText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
  },
});

export default ChatListScreen;

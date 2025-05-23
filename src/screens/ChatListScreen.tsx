import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  ChatService,
  UserService,
  ChatData,
  UserData,
} from "../services/firebase";
import { useFocusEffect } from "@react-navigation/native";

interface ChatListScreenProps {
  navigation: any;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const [chats, setChats] = useState<ChatData[]>([]);
  const [users, setUsers] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Получение текущего пользователя
  const currentUser = ChatService.getCurrentUser();

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

  // Рендер элемента чата
  const renderChatItem = ({ item }: { item: ChatData }) => {
    const otherUser = getOtherParticipant(item);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser?.displayName?.charAt(0) || "?"}
          </Text>
        </View>

        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>
            {otherUser?.displayName || "Пользователь"}
          </Text>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.text || "Нет сообщений"}
          </Text>
        </View>

        {item.lastMessage.timestamp && (
          <Text style={styles.timestamp}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A86E8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>У вас пока нет чатов</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleNewChat}
            >
              <Text style={styles.emptyButtonText}>Начать новый чат</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
        <Text style={styles.newChatButtonText}>+</Text>
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

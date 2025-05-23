import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { UserService, ChatService, UserData } from "../services/firebase";
import { useFocusEffect } from "@react-navigation/native";

interface UserListScreenProps {
  navigation: any;
}

const UserListScreen: React.FC<UserListScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Получение текущего пользователя
  const currentUser = ChatService.getCurrentUser();

  // Reload users when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  useEffect(() => {
    loadUsers();
  }, []);

  // Загрузка всех пользователей
  const loadUsers = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const allUsers = await UserService.getAllUsers();

      // Фильтрация текущего пользователя из списка
      const otherUsers = allUsers.filter(
        (user) => user.uid !== currentUser.uid
      );

      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
      setLoading(false);
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
      Alert.alert("Ошибка", "Не удалось загрузить список пользователей");
      setLoading(false);
    }
  };

  // Поиск пользователей по имени
  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (!text.trim()) {
      setFilteredUsers(users);
      return;
    }

    if (text.length < 2) return;

    try {
      setSearching(true);

      // Поиск по имени в Firestore
      const searchResults = await UserService.searchUsersByName(text);

      // Фильтрация текущего пользователя из результатов
      const filteredResults = searchResults.filter(
        (user) => user.uid !== currentUser?.uid
      );

      setFilteredUsers(filteredResults);
      setSearching(false);
    } catch (error) {
      console.error("Ошибка при поиске пользователей:", error);
      setSearching(false);
    }
  };

  // Создание чата с выбранным пользователем
  const handleUserSelect = async (user: UserData) => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Создание или получение существующего чата
      const chatId = await ChatService.createChat(currentUser.uid, user.uid);

      // Переход к экрану чата
      navigation.navigate("Chat", {
        chatId,
        userId: user.uid,
        userName: user.displayName,
      });

      setLoading(false);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      Alert.alert("Ошибка", "Не удалось создать чат");
      setLoading(false);
    }
  };

  // Рендер элемента пользователя
  const renderUserItem = ({ item }: { item: UserData }) => {
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserSelect(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userStatus}>
            {item.status === "online" ? "В сети" : "Не в сети"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск пользователей..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && (
          <ActivityIndicator
            size="small"
            color="#4A86E8"
            style={styles.searchIndicator}
          />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A86E8" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderUserItem}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Пользователи не найдены"
                  : "Список пользователей пуст"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchIndicator: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  usersList: {
    padding: 10,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  userStatus: {
    fontSize: 14,
    color: "#666",
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
  },
});

export default UserListScreen;

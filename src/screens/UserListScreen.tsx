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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  UserService,
  ChatService,
  AuthService,
  UserData,
} from "../services/firebase";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../services/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface UserListScreenProps {
  navigation: any;
}

const UserListScreen: React.FC<UserListScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Получаем тему из контекста
  const { colors, isDarkTheme } = useTheme();

  // Получение текущего пользователя
  const currentUser = AuthService.getCurrentUser();

  const insets = useSafeAreaInsets();

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

      // Сортировка пользователей по имени
      const sortedUsers = otherUsers.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
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

      // Сортировка результатов поиска по имени
      const sortedResults = filteredResults.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      setFilteredUsers(sortedResults);
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

  // Удаление пользователя
  const handleDeleteUser = (user: UserData) => {
    Alert.alert(
      "Подтверждение удаления",
      `Удалить пользователя ${user.displayName}?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await UserService.deleteUser(user.uid);
              await loadUsers();
              Alert.alert("Успех", "Пользователь удалён");
            } catch (error) {
              console.error("Ошибка при удалении пользователя:", error);
              Alert.alert("Ошибка", "Не удалось удалить пользователя");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Динамические стили на основе текущей темы
  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      padding: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
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
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 15,
      marginBottom: 10,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
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
      marginBottom: 5,
      color: colors.text,
    },
    userStatus: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      marginTop: 50,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
      textAlign: "center",
    },
  });

  // Рендер элемента пользователя
  const renderUserItem = ({ item }: { item: UserData }) => {
    return (
      <TouchableOpacity
        style={themedStyles.userItem}
        onPress={() => handleUserSelect(item)}
        onLongPress={() => handleDeleteUser(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={themedStyles.userName}>{item.displayName}</Text>
          <Text style={themedStyles.userStatus}>
            {item.status === "online" ? "В сети" : "Не в сети"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={themedStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 60}
    >
      <View style={themedStyles.searchContainer}>
        <TextInput
          style={themedStyles.searchInput}
          placeholder="Поиск пользователей..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.searchIndicator}
          />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderUserItem}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={themedStyles.emptyText}>
                {searchQuery
                  ? "Пользователи не найдены"
                  : "Список пользователей пуст"}
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
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

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { AuthService } from "../services/firebase";
import firebase from "firebase/compat/app";
import { useState, useEffect } from "react";
import { useTheme } from "../services/ThemeContext";
import {
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from "@react-navigation/native";

// Импортируем экраны с обработкой ошибок
const importScreen = (getScreen: () => any, name: string) => {
  try {
    return getScreen();
  } catch (error) {
    console.error(`Error importing ${name}:`, error);
    return () => (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>
          Test AppNavigator: если вы видите этот экран, проблема в одном из
          импортируемых экранов или сервисов.
        </Text>
        <Text style={styles.errorDetails}>{`Ошибка в модуле: ${name}`}</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      </View>
    );
  }
};

// Импортируем экраны
const LoginScreen = importScreen(
  () => require("../screens/LoginScreen").default,
  "LoginScreen"
);
const RegisterScreen = importScreen(
  () => require("../screens/RegisterScreen").default,
  "RegisterScreen"
);
const ChatListScreen = importScreen(
  () => require("../screens/ChatListScreen").default,
  "ChatListScreen"
);
const ChatScreen = importScreen(
  () => require("../screens/ChatScreen").default,
  "ChatScreen"
);
const UserListScreen = importScreen(
  () => require("../screens/UserListScreen").default,
  "UserListScreen"
);
const ProfileScreen = importScreen(
  () => require("../screens/ProfileScreen").default,
  "ProfileScreen"
);
const AddUserScreen = importScreen(
  () => require("../screens/AddUserScreen").default,
  "AddUserScreen"
);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Навигатор для авторизованных пользователей
const MainNavigator = () => {
  const { colors } = useTheme();
  try {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: React.ComponentProps<typeof Ionicons>["name"] =
              "chatbubbles";

            if (route.name === "Chats") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
            } else if (route.name === "Users") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        })}
      >
        <Tab.Screen
          name="Chats"
          component={ChatListScreen}
          options={{ title: "Чаты" }}
        />
        <Tab.Screen
          name="Users"
          component={UserListScreen}
          options={{ title: "Пользователи" }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Профиль" }}
        />
      </Tab.Navigator>
    );
  } catch (error) {
    console.error("Error in MainNavigator:", error);
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>
          Test AppNavigator: если вы видите этот экран, проблема в одном из
          импортируемых экранов или сервисов.
        </Text>
        <Text style={styles.errorDetails}>Ошибка в MainNavigator</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      </View>
    );
  }
};

// Основной навигатор приложения
const AppNavigator = () => {
  const { colors, isDarkTheme } = useTheme();
  const navigationTheme = isDarkTheme
    ? {
        ...NavDarkTheme,
        colors: {
          ...NavDarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          primary: colors.primary,
          border: colors.border,
        },
      }
    : {
        ...NavDefaultTheme,
        colors: {
          ...NavDefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          primary: colors.primary,
          border: colors.border,
        },
      };
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<firebase.User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Слушатель изменения состояния аутентификации
  useEffect(() => {
    try {
      const unsubscribe = AuthService.onAuthStateChanged((user) => {
        setUser(user);
        if (initializing) {
          setInitializing(false);
        }
      });

      // Отписка при размонтировании компонента
      return unsubscribe;
    } catch (e) {
      console.error("Error in auth state change subscription:", e);
      setError(e instanceof Error ? e : new Error(String(e)));
      setInitializing(false);
      return () => {};
    }
  }, [initializing]);

  // Показываем индикатор загрузки, пока проверяем состояние аутентификации
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A86E8" />
      </View>
    );
  }

  // Показываем экран с ошибкой
  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>
          Test AppNavigator: если вы видите этот экран, проблема в одном из
          импортируемых экранов или сервисов.
        </Text>
        <Text style={styles.errorDetails}>Ошибка в AuthService</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  try {
    return (
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // Стек для авторизованных пользователей
            <>
              <Stack.Screen name="Main" component={MainNavigator} />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: true, title: "Чат" }}
              />
              <Stack.Screen
                name="AddUser"
                component={AddUserScreen}
                options={{ headerShown: true, title: "Добавить пользователя" }}
              />
            </>
          ) : (
            // Стек для неавторизованных пользователей
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (e) {
    console.error("Error in rendering NavigationContainer:", e);
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>
          Test AppNavigator: если вы видите этот экран, проблема в одном из
          импортируемых экранов или сервисов.
        </Text>
        <Text style={styles.errorDetails}>Ошибка в NavigationContainer</Text>
        <Text style={styles.errorMessage}>
          {e instanceof Error ? e.message : String(e)}
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  errorDetails: {
    fontSize: 14,
    color: "red",
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 12,
    color: "#666",
  },
});

export default AppNavigator;

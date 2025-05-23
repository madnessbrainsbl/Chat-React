import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import UserListScreen from "../screens/UserListScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddUserScreen from "../screens/AddUserScreen";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthService } from "../services/firebase";
import { User } from "firebase/auth";
import { useState, useEffect } from "react";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Навигатор для авторизованных пользователей
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Chats") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Users") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4A86E8",
        tabBarInactiveTintColor: "gray",
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
};

// Основной навигатор приложения
const AppNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Слушатель изменения состояния аутентификации
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      if (initializing) {
        setInitializing(false);
      }
    });

    // Отписка при размонтировании компонента
    return unsubscribe;
  }, [initializing]);

  // Показываем индикатор загрузки, пока проверяем состояние аутентификации
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A86E8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});

export default AppNavigator;

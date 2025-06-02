import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { View, Text, StyleSheet, LogBox } from "react-native";
import * as FileSystem from "expo-file-system";
import { AuthService } from "./src/services/firebase";
import { ThemeProvider, useTheme } from "./src/services/ThemeContext";


LogBox.ignoreLogs(["Warning:"]);


const logErrorToFile = async (error: any) => {
  try {
    const errorMessage = `${new Date().toISOString()}: ${error?.toString()} ${
      error?.stack || ""
    }\n`;
    const logFilePath = `${FileSystem.documentDirectory}error_log.txt`;


    const fileInfo = await FileSystem.getInfoAsync(logFilePath);

    if (fileInfo.exists) {

      const currentContent = await FileSystem.readAsStringAsync(logFilePath);
      await FileSystem.writeAsStringAsync(
        logFilePath,
        currentContent + errorMessage
      );
    } else {

      await FileSystem.writeAsStringAsync(logFilePath, errorMessage);
    }

    console.error("Error logged to file:", logFilePath);
  } catch (logError) {
    console.error("Failed to write error log:", logError);
  }
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Проверка статуса аутентификации при запуске
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      // Проверяем, аутентифицировался ли пользователь
      setIsAuthenticated(!!user);


      setIsReady(true);
    });

    return () => unsubscribe();
  }, []);


  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <ThemeProvider>
      <AppContent isAuthenticated={isAuthenticated} />
    </ThemeProvider>
  );
}


const AppContent: React.FC<{ isAuthenticated: boolean }> = ({
  isAuthenticated,
}) => {
  const { colors, isDarkTheme } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkTheme ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppNavigator isAuthenticated={isAuthenticated} />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#ff3b30",
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
  },
});

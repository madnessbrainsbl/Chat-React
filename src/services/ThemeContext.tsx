import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Типы тем
export type ThemeMode = "light" | "dark" | "system";

// Цвета для каждой темы
interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  border: string;
  statusBarStyle: "light-content" | "dark-content";
  keyboardAppearance: "light" | "dark";
  chatBubbleSent: string;
  chatBubbleReceived: string;
  inputBackground: string;
}

// Набор светлых цветов
export const lightColors: ThemeColors = {
  background: "#f5f5f5",
  surface: "#ffffff",
  text: "#333333",
  textSecondary: "#666666",
  primary: "#4A86E8",
  accent: "#f44336",
  border: "#e0e0e0",
  statusBarStyle: "dark-content",
  keyboardAppearance: "light",
  chatBubbleSent: "#DCF8C6",
  chatBubbleReceived: "#ffffff",
  inputBackground: "#f0f0f0",
};

// Набор темных цветов
export const darkColors: ThemeColors = {
  background: "#121212",
  surface: "#1e1e1e",
  text: "#f5f5f5",
  textSecondary: "#aaaaaa",
  primary: "#5C9CFF",
  accent: "#ff6659",
  border: "#333333",
  statusBarStyle: "light-content",
  keyboardAppearance: "dark",
  chatBubbleSent: "#056162",
  chatBubbleReceived: "#262d31",
  inputBackground: "#262d31",
};

// Интерфейс для контекста темы
interface ThemeContextProps {
  themeMode: ThemeMode;
  isDarkTheme: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// Создаем контекст с дефолтными значениями
export const ThemeContext = createContext<ThemeContextProps>({
  themeMode: "dark",
  isDarkTheme: true,
  colors: darkColors,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

// Хук для использования темы в компонентах
export const useTheme = () => useContext(ThemeContext);

// Провайдер для управления темой
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State for theme mode ('light', 'dark', or 'system')
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const systemColorScheme = useColorScheme();

  // Load saved theme mode from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@themeMode");
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemeModeState(saved);
        }
      } catch (e) {
        console.warn("Failed to load theme mode:", e);
      }
    })();
  }, []);

  // Persist theme mode changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem("@themeMode", themeMode);
      } catch (e) {
        console.warn("Failed to save theme mode:", e);
      }
    })();
  }, [themeMode]);

  // Determine actual theme based on mode and system preference
  const isDarkTheme =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";
  const colors = isDarkTheme ? darkColors : lightColors;

  // Functions to update theme
  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);
  const toggleTheme = () => {
    if (themeMode === "system") {
      setThemeModeState(systemColorScheme === "dark" ? "light" : "dark");
    } else {
      setThemeModeState(themeMode === "dark" ? "light" : "dark");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkTheme,
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

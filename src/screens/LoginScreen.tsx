import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../services/firebase";
import { useTheme } from "../services/ThemeContext";

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { colors, isDarkTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Пожалуйста, заполните все поля");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const user = await AuthService.login(email, password);

      if (!user) {
        setErrorMessage("Ошибка аутентификации. Проверьте введенные данные");
      }
      // Навигация будет обрабатываться через слушатель состояния аутентификации
    } catch (error: any) {
      let message = "Произошла ошибка при входе";

      if (error.code === "auth/user-not-found") {
        message = "Пользователь с таким email не найден";
      } else if (error.code === "auth/wrong-password") {
        message = "Неверный пароль";
      } else if (error.code === "auth/invalid-email") {
        message = "Неверный формат email";
      } else if (error.code === "auth/invalid-credential") {
        message = "Неверный email или пароль";
      } else if (error.code === "auth/too-many-requests") {
        message = "Слишком много попыток входа. Попробуйте позже";
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // Динамические стили с учетом темы
  const themedStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 30,
      color: colors.text,
    },
    inputContainer: {
      width: "100%",
      marginBottom: 20,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      width: "100%",
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 15,
      width: "100%",
      alignItems: "center",
      marginBottom: 20,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
    },
    footer: {
      flexDirection: "row",
      marginTop: 20,
    },
    footerText: {
      color: colors.textSecondary,
      marginRight: 5,
    },
    footerLink: {
      color: colors.primary,
      fontWeight: "bold",
    },
    errorContainer: {
      backgroundColor: colors.error,
      borderRadius: 8,
      padding: 10,
      marginBottom: 15,
      width: "100%",
    },
    errorText: {
      color: "#fff",
      textAlign: "center",
    },
  });

  return (
    <SafeAreaView style={themedStyles.safeArea}>
      <KeyboardAvoidingView
        style={themedStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={themedStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={themedStyles.title}>Вход в аккаунт</Text>

          {errorMessage && (
            <View style={themedStyles.errorContainer}>
              <Text style={themedStyles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={themedStyles.inputContainer}>
            <TextInput
              style={themedStyles.input}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={themedStyles.input}
              placeholder="Пароль"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage(null);
              }}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            style={themedStyles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={themedStyles.buttonText}>Войти</Text>
            )}
          </TouchableOpacity>
          <View style={themedStyles.footer}>
            <Text style={themedStyles.footerText}>Еще нет аккаунта?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={themedStyles.footerLink}>Зарегистрироваться</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

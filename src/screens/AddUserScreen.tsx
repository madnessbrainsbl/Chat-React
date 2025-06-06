import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserService } from "../services/firebase";

interface AddUserScreenProps {
  navigation: any;
}

const AddUserScreen: React.FC<AddUserScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleAddUser = async () => {
    if (!email.trim() || !displayName.trim()) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }
    try {
      await UserService.addUser(email.trim(), displayName.trim());
      Alert.alert("Успех", "Пользователь добавлен", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Main", { screen: "Users" }),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось добавить пользователя");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Введите email"
          />

          <Text style={styles.label}>Имя пользователя</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            placeholder="Введите имя пользователя"
          />

          <TouchableOpacity style={styles.button} onPress={handleAddUser}>
            <Text style={styles.buttonText}>Добавить пользователя</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddUserScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    marginTop: 30,
    backgroundColor: "#4A86E8",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

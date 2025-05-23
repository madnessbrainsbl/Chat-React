import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
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
    <View style={styles.container}>
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
    </View>
  );
};

export default AddUserScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
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

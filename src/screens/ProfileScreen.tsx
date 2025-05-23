import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthService, UserService } from "../services/firebase";

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Получение текущего пользователя
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Загрузка профиля пользователя
  const loadUserProfile = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userData = await UserService.getUserData(currentUser.uid);

      if (userData) {
        setDisplayName(userData.displayName);
        setPhotoURL(userData.photoURL || null);
      }

      setLoading(false);
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
      Alert.alert("Ошибка", "Не удалось загрузить данные профиля");
      setLoading(false);
    }
  };

  // Обновление имени пользователя
  const handleUpdateProfile = async () => {
    if (!currentUser || !displayName.trim()) {
      Alert.alert("Ошибка", "Имя пользователя не может быть пустым");
      return;
    }

    try {
      setUpdating(true);

      // Обновление профиля в Firebase Auth
      await AuthService.updateProfile(currentUser.uid, {
        displayName: displayName.trim(),
      });

      Alert.alert("Успех", "Профиль успешно обновлен");
      setUpdating(false);
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      Alert.alert("Ошибка", "Не удалось обновить профиль");
      setUpdating(false);
    }
  };

  // Выбор и загрузка аватара
  const handleChangeAvatar = async () => {
    if (!currentUser) return;

    try {
      // Запрос разрешения на доступ к галерее
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Ошибка", "Необходимо разрешение на доступ к галерее");
        return;
      }

      // Выбор изображения
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingAvatar(true);

        // Загрузка аватара
        const downloadURL = await UserService.uploadAvatar(
          currentUser.uid,
          result.assets[0].uri
        );

        setPhotoURL(downloadURL);
        setUploadingAvatar(false);

        Alert.alert("Успех", "Аватар успешно обновлен");
      }
    } catch (error) {
      console.error("Ошибка при загрузке аватара:", error);
      Alert.alert("Ошибка", "Не удалось загрузить аватар");
      setUploadingAvatar(false);
    }
  };

  // Выход из аккаунта
  const handleLogout = async () => {
    try {
      await AuthService.logout();
      // Навигация будет обрабатываться через слушатель состояния аутентификации
    } catch (error) {
      console.error("Ошибка при выходе из аккаунта:", error);
      Alert.alert("Ошибка", "Не удалось выйти из аккаунта");
    }
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
      <ImageBackground
        source={{ uri: photoURL || "https://via.placeholder.com/600x200" }}
        style={styles.header}
        imageStyle={styles.headerImage}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
              </View>
            )}

            <View style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarButtonText}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.headerName}>{displayName}</Text>
          <Text style={styles.headerEmail}>{currentUser?.email}</Text>
        </View>
      </ImageBackground>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Имя пользователя</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Введите имя пользователя"
        />

        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdateProfile}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Обновить профиль</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
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
  header: {
    alignItems: "center",
    padding: 20,
  },
  headerImage: {
    resizeMode: "cover",
  },
  headerContent: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#4A86E8",
  },
  changeAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  changeAvatarButtonText: {
    fontSize: 16,
  },
  headerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  headerEmail: {
    color: "#fff",
    fontSize: 16,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  updateButton: {
    backgroundColor: "#4A86E8",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: "#f44336",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ProfileScreen;

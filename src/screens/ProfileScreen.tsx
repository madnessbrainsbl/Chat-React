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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { AuthService, UserService } from "../services/firebase";
import { uploadToGoogleDrive } from "../services/drive";
import { useTheme } from "../services/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

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

  // Получаем тему из контекста
  const { colors, isDarkTheme, toggleTheme } = useTheme();

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

        // Проверяем, что фото URL существует и не пустой
        if (userData.photoURL) {
          console.log("Загружен аватар пользователя:", userData.photoURL);
          // Добавляем случайный параметр к URL для предотвращения кеширования
          const photoURLWithCache = `${userData.photoURL}?cache=${Date.now()}`;
          setPhotoURL(photoURLWithCache);
        } else {
          console.log("У пользователя нет аватара");
          setPhotoURL(null);
        }
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

    // Запрос разрешения на доступ к галерее
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const localUri = result.assets[0].uri;

    try {
      // Запрос разрешения на запись в галерею (может быть ограничено в Expo Go)
      try {
        const libraryPermission = await MediaLibrary.requestPermissionsAsync();
        if (libraryPermission.status === "granted") {
          try {
            // Сохраняем копию файла в галерее устройства (может не работать в Expo Go)
            const asset = await MediaLibrary.createAssetAsync(localUri);
            try {
              await MediaLibrary.createAlbumAsync(
                "MobileChatApp",
                asset,
                false
              );
              console.log("Фотография сохранена в галерее устройства");
            } catch (albumError) {
              console.warn(
                "Ограничение создания альбома (Expo Go):",
                albumError
              );
            }
          } catch (mediaError) {
            console.warn("Ограничение доступа к медиатеке:", mediaError);
          }
        }
      } catch (permError) {
        console.warn("Ошибка получения разрешений:", permError);
      }

      // Показываем выбранное изображение сразу для лучшего UX
      setPhotoURL(localUri);
      setUploadingAvatar(true);

      // Генерируем имя файла с расширением
      const fileInfo = localUri.split("/").pop() || "";
      const fileExt = fileInfo.includes(".")
        ? fileInfo.split(".").pop()
        : "jpg";
      const fileName = `avatar_${currentUser.uid}_${Date.now()}.${fileExt}`;

      try {
        // Сначала пробуем загрузить на сервер
        const downloadURL = await uploadToGoogleDrive(localUri, fileName);
        console.log("Полученный URL аватара:", downloadURL);

        // Немедленно обновляем UI с новым аватаром
        setPhotoURL(downloadURL);

        // Обновление профиля в Firebase
        await AuthService.updateProfile(currentUser.uid, {
          photoURL: downloadURL,
        });
      } catch (uploadError) {
        // Если загрузка не удалась, используем локальный URI как временное решение
        console.warn(
          "Не удалось загрузить аватар на сервер, используем локальную версию:",
          uploadError
        );

        // Копируем файл в постоянное хранилище приложения
        try {
          const permanentDir = FileSystem.documentDirectory + "avatars/";
          try {
            await FileSystem.makeDirectoryAsync(permanentDir, {
              intermediates: true,
            });
          } catch (e) {
            // Директория уже может существовать
          }

          const permanentUri = permanentDir + fileName;
          await FileSystem.copyAsync({
            from: localUri,
            to: permanentUri,
          });

          // Используем локальный URI для отображения и сохранения
          console.log("Локальный аватар сохранен:", permanentUri);
          setPhotoURL(permanentUri);

          // Обновляем профиль с локальным URI
          await AuthService.updateProfile(currentUser.uid, {
            photoURL: permanentUri,
          });
        } catch (e) {
          console.error("Не удалось сохранить локальный аватар:", e);
          throw e; // Пробрасываем ошибку дальше
        }

        Alert.alert(
          "Успех",
          "Аватар успешно обновлен и сохранен на устройстве"
        );
      }
    } catch (error: any) {
      console.error("Ошибка при загрузке аватара:", error);
      Alert.alert("Ошибка", error.message || "Не удалось загрузить аватар");
      // Возвращаем предыдущий аватар в случае ошибки
      loadUserProfile();
    } finally {
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

  // Обновляем стили с использованием цветов темы
  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardAvoidingContainer: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    themeToggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 20,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeToggleText: {
      color: colors.text,
      fontSize: 16,
    },
    formContainer: {
      padding: 20,
    },
    label: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 5,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 15,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    updateButton: {
      backgroundColor: colors.primary,
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
      backgroundColor: colors.accent,
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A86E8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container}>
      <KeyboardAvoidingView
        style={themedStyles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={themedStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <ImageBackground
            source={{
              uri: photoURL || "https://i.pravatar.cc/600?u=default",
              cache: "reload",
            }}
            style={styles.header}
            imageStyle={styles.headerImage}
            key={photoURL}
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
                  <Image
                    source={{
                      uri: photoURL,
                      cache: "reload",
                    }}
                    style={styles.avatar}
                    key={`avatar_${photoURL}`}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0)}
                    </Text>
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

          {/* Переключатель темы */}
          <View style={themedStyles.themeToggleContainer}>
            <Text style={themedStyles.themeToggleText}>Темная тема</Text>
            <Switch
              value={isDarkTheme}
              onValueChange={toggleTheme}
              thumbColor={isDarkTheme ? colors.primary : "#f4f3f4"}
              trackColor={{ false: "#767577", true: `${colors.primary}80` }}
            />
          </View>

          <View style={themedStyles.formContainer}>
            <Text style={themedStyles.label}>Имя пользователя</Text>
            <TextInput
              style={themedStyles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Введите имя пользователя"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={themedStyles.updateButton}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={themedStyles.updateButtonText}>
                  Обновить профиль
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={themedStyles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={themedStyles.logoutButtonText}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
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
    backgroundColor: "#4A86E8",
    height: 200,
  },
  headerImage: {
    resizeMode: "cover",
    opacity: 0.8,
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
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ffffff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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

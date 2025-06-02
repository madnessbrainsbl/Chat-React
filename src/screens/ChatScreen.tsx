import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  AppState,
  Keyboard,
  Animated,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import {
  MessageService,
  ChatService,
  AuthService,
  MessageData,
  firestore,
} from "../services/firebase";
import { Timestamp } from "firebase/firestore";
import Notifications, {
  isNotificationsSupported,
} from "../services/notifications";
import { useTheme } from "../services/ThemeContext";

interface ChatScreenProps {
  route: {
    params: {
      chatId: string;
      userId: string;
      userName: string;
    };
  };
  navigation: any;
}

// Настройка обработчика локальных уведомлений (теперь это безопасно)
if (isNotificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { chatId, userId, userName } = route.params;
  const messagesRef = useRef<MessageData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [downloadingUri, setDownloadingUri] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { colors, isDarkTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "reconnecting" | "error"
  >("connected");

  // Получение текущего пользователя
  const currentUser = AuthService.getCurrentUser();

  // Анимированные значения для точек
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  // Модифицированная регистрация уведомлений
  useEffect(() => {
    // Безопасная проверка поддержки уведомлений
    if (isNotificationsSupported) {
      console.log("Notifications are supported, setting up permissions");
      Notifications.requestPermissionsAsync();
    } else {
      console.log("Notifications are disabled in development mode");
    }
  }, []);

  useEffect(() => {
    // Установка заголовка чата
    navigation.setOptions({ title: userName });

    if (!currentUser || !chatId) {
      console.log("No currentUser or chatId available");
      return;
    }

    console.log("Loading messages for chat:", chatId);
    setLoading(true);

    // Функция для загрузки сообщений напрямую
    const loadMessages = async () => {
      try {
        const chatMessages = await MessageService.getChatMessages(chatId);
        console.log(`Loaded ${chatMessages.length} messages directly`);

        if (chatMessages.length > 0) {
          setMessages(chatMessages);
          setLoading(false);

          // Прокрутка к последнему сообщению
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }, 100);
        } else {
          console.log("No messages found for this chat");
          setMessages([]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        setLoading(false);
        setConnectionStatus("error");
      }
    };

    // Загружаем сообщения сразу
    loadMessages();

    // Устанавливаем слушатель для новых сообщений (только для уведомлений)
    const unsubscribe = MessageService.onChatMessagesUpdate(
      chatId,
      (updatedMessages) => {
        // Проверяем, есть ли новые сообщения по сравнению с текущими
        setMessages((currentMessages) => {
          // Если получили пустой массив и у нас уже есть сообщения, не обновляем
          if (updatedMessages.length === 0 && currentMessages.length > 0) {
            return currentMessages;
          }

          // Находим сообщения, которых нет в текущем состоянии
          const currentIds = new Set(currentMessages.map((msg) => msg.id));
          const newMessages = updatedMessages.filter(
            (msg) => !currentIds.has(msg.id) && !msg.id.startsWith("temp_")
          );

          if (newMessages.length > 0) {
            console.log(
              `Received ${newMessages.length} new messages from listener`
            );

            // Прокручиваем к новым сообщениям
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);

            // Объединяем текущие сообщения с новыми
            return [
              ...currentMessages.filter((msg) => !msg.id.startsWith("temp_")),
              ...newMessages,
            ];
          }

          return currentMessages;
        });
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser, navigation, userName]);

  // Добавляем отслеживание состояния клавиатуры
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Прокрутка к последнему сообщению при появлении клавиатуры
        if (flatListRef.current && messages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [messages]);

  // Добавляем подписку на статус набора текста партнера
  useEffect(() => {
    if (!chatId || !userId || !currentUser) return;

    const unsubscribe = MessageService.onTypingStatusChange(
      chatId,
      userId, // ID другого пользователя
      (isTyping) => setPartnerIsTyping(isTyping)
    );

    return () => unsubscribe();
  }, [chatId, userId, currentUser]);

  // Запуск анимации при изменении статуса набора текста
  useEffect(() => {
    if (partnerIsTyping) {
      startTypingAnimation();
    }
  }, [partnerIsTyping]);

  // Функция запуска анимации точек
  const startTypingAnimation = () => {
    // Сбрасываем значения
    dot1Opacity.setValue(0.4);
    dot2Opacity.setValue(0.4);
    dot3Opacity.setValue(0.4);

    // Последовательная анимация для каждой точки
    Animated.sequence([
      // Первая точка
      Animated.timing(dot1Opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Вторая точка
      Animated.timing(dot2Opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Третья точка
      Animated.timing(dot3Opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Повторяем анимацию, если статус набора текста всё еще активен
      if (partnerIsTyping) {
        startTypingAnimation();
      }
    });
  };

  // Отправка текстового сообщения - упрощенная версия
  const handleSendMessage = async () => {
    if (!text.trim() || !currentUser || !chatId) {
      console.log("Cannot send empty message or missing user/chat");
      return;
    }

    const messageText = text.trim();
    console.log("Sending text message:", messageText);

    // Очищаем поле ввода сразу
    setText("");

    try {
      // Создаем локальное сообщение с временным ID
      const tempId = `temp_${Date.now()}`;
      const newMessage: MessageData = {
        id: tempId,
        senderId: currentUser.uid,
        text: messageText,
        timestamp: Timestamp.now(),
        type: "text",
        read: false,
      };

      // Обновляем локальный UI немедленно - добавляем напрямую
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Прокручиваем к новому сообщению
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

      // Отправляем на сервер
      const msgId = await MessageService.sendTextMessage(
        chatId,
        currentUser.uid,
        messageText
      );

      console.log("Message sent with ID:", msgId);

      // Обновляем ID сообщения на полученный от сервера
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, id: msgId } : msg
        )
      );
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      Alert.alert("Ошибка", "Не удалось отправить сообщение");

      // Удаляем временное сообщение в случае ошибки
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => !msg.id.startsWith("temp_"))
      );
    }
  };

  // Отправка случайного изображения
  const handleSendImage = async () => {
    if (!currentUser || !chatId) {
      Alert.alert("Ошибка", "Необходимо войти в систему");
      return;
    }

    setSending(true);
    try {
      // Используем тестовый URL с котиком
      const imageUrl = `https://cataas.com/cat?width=300&height=300&time=${Date.now()}`;

      console.log("Тестовое изображение:", imageUrl);

      // Добавляем локально для мгновенной обратной связи
      const tempId = `temp_${Date.now()}`;
      const newImageMessage: MessageData = {
        id: tempId,
        senderId: currentUser.uid,
        text: "🖼️ Изображение",
        timestamp: Timestamp.now(),
        type: "image",
        fileURL: imageUrl, // Прямой URL
        read: false,
      };

      // Явно добавляем новое сообщение в список
      setMessages((prevMessages) => [...prevMessages, newImageMessage]);

      // Прокручиваем к новому сообщению
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

      // Отправляем на сервер (это может занять время)
      const msgId = await MessageService.sendImageMessage(
        chatId,
        currentUser.uid,
        imageUrl
      );

      console.log("Изображение успешно отправлено с ID:", msgId);

      // Обновляем ID в локальных сообщениях
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, id: msgId } : msg
        )
      );
    } catch (error) {
      console.error("Ошибка при отправке тестового изображения:", error);

      // Показываем сообщение об ошибке
      Alert.alert(
        "Ошибка отправки",
        "Не удалось отправить тестовое изображение. Попробуйте еще раз."
      );

      // Удаляем локальное сообщение в случае ошибки
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => !msg.id.startsWith("temp_"))
      );
    } finally {
      setSending(false);
    }
  };

  // Отправка изображения из галереи устройства
  const handlePickImage = async () => {
    if (!currentUser || !chatId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ошибка", "Необходим доступ к галерее");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) return;

      // URI выбранного изображения
      const localUri = result.assets[0].uri;
      console.log("Selected image URI:", localUri);

      // Создаем временное сообщение для UI
      const tempId = `temp_${Date.now()}`;
      const newLocalMessage: MessageData = {
        id: tempId,
        senderId: currentUser.uid,
        text: "🖼️ Изображение",
        timestamp: Timestamp.now(),
        type: "image",
        fileURL: localUri,
        read: false,
      };

      // Добавляем в интерфейс немедленно
      setMessages((prevMessages) => [...prevMessages, newLocalMessage]);

      // Прокручиваем список к новому сообщению
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

      // Отправляем на сервер
      const msgId = await MessageService.sendImageMessage(
        chatId,
        currentUser.uid,
        localUri
      );

      console.log("Image message sent with ID:", msgId);

      // Обновляем ID
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, id: msgId } : msg
        )
      );
    } catch (error) {
      console.error("Ошибка при отправке изображения из галереи:", error);
      Alert.alert("Ошибка", "Не удалось отправить изображение");

      // Удаляем временное сообщение в случае ошибки
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => !msg.id.startsWith("temp_"))
      );
    }
  };

  // Обновленный метод скачивания изображений
  const handleDownloadImage = async (uri: string) => {
    try {
      // Проверяем, доступны ли разрешения на доступ к галерее
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Ограниченный доступ",
          "В Expo Go доступ к галерее ограничен. Вы можете сохранять изображения вручную через долгое нажатие."
        );
        return;
      }

      setDownloadingUri(uri);
      console.log("Начало загрузки изображения:", uri);

      try {
        // Определяем assetUri для сохранения в галерею
        let assetUri = uri;
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          // Скачиваем удалённое изображение
          const fileName = `image_${Date.now()}.jpg`;
          const localUri = FileSystem.documentDirectory + fileName;
          await FileSystem.downloadAsync(uri, localUri);
          console.log("Файл скачан локально:", localUri);
          assetUri = localUri;
        } else if (uri.startsWith("data:image")) {
          // Декодируем base64-данные
          const fileName = `image_${Date.now()}.jpg`;
          const localUri = FileSystem.documentDirectory + fileName;
          const base64Data = uri.split(",")[1];
          await FileSystem.writeAsStringAsync(localUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log(
            "Base64 изображение сохранено во временный файл:",
            localUri
          );
          assetUri = localUri;
        } // для file:// URI assetUri остаётся без изменений

        try {
          // Пытаемся сохранить в галерею (может быть ограничено в Expo Go)
          const asset = await MediaLibrary.createAssetAsync(assetUri);

          try {
            // В Expo Go создание альбомов может не работать из-за ограничений
            const album = await MediaLibrary.getAlbumAsync("MobileChatApp");
            if (album === null) {
              await MediaLibrary.createAlbumAsync(
                "MobileChatApp",
                asset,
                false
              );
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
            Alert.alert("Успех", "Изображение сохранено в галерею");
          } catch (albumError) {
            console.warn(
              "Невозможно создать альбом (ограничение Expo Go):",
              albumError
            );
            Alert.alert(
              "Уведомление",
              "Изображение сохранено в галерею, но не в отдельный альбом из-за ограничений Expo Go"
            );
          }
        } catch (mediaError) {
          console.warn("Проблема с доступом к галерее:", mediaError);

          // Предлагаем пользователю скопировать изображение вручную
          Alert.alert(
            "Внимание",
            "Из-за ограничений Expo Go невозможно сохранить изображение напрямую. Изображение доступно для просмотра и копирования."
          );
        }
      } catch (error) {
        console.error("Ошибка при сохранении:", error);
        Alert.alert("Ошибка", "Не удалось сохранить изображение");
      }
    } finally {
      setDownloadingUri(null);
    }
  };

  // Определение, является ли сообщение отправленным текущим пользователем
  const isOwnMessage = (message: MessageData) => {
    return message.senderId === currentUser?.uid;
  };

  // Форматирование времени сообщения
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Функция для обработки изменения текста
  const handleTextChange = (text: string) => {
    setText(text);

    // Отправляем статус набора текста только если пользователь начал печатать
    if (!isTyping && text.length > 0 && currentUser && chatId) {
      setIsTyping(true);
      MessageService.updateTypingStatus(chatId, currentUser.uid, true);
    }

    // Сбрасываем таймер если он был установлен
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Устанавливаем новый таймер для прекращения статуса набора
    typingTimeoutRef.current = setTimeout(() => {
      if (currentUser && chatId) {
        setIsTyping(false);
        MessageService.updateTypingStatus(chatId, currentUser.uid, false);
      }
    }, 3000);
  };

  // Функция для обновления чата при потягивании вниз (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!chatId) return;

    setRefreshing(true);
    console.log("Manually refreshing chat messages...");

    try {
      // Принудительно загружаем сообщения напрямую
      const refreshedMessages = await MessageService.getChatMessages(chatId);
      console.log(`Refreshed ${refreshedMessages.length} messages`);

      if (refreshedMessages.length > 0) {
        setMessages(refreshedMessages);

        // Прокручиваем к последнему сообщению
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }, 100);

        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Error refreshing messages:", error);
      setConnectionStatus("error");
      Alert.alert(
        "Ошибка соединения",
        "Не удалось обновить сообщения. Проверьте подключение к интернету."
      );
    } finally {
      setRefreshing(false);
    }
  }, [chatId]);

  // Проверка состояния соединения
  useEffect(() => {
    const checkConnection = async () => {
      if (!chatId) return;

      try {
        // Простая проверка - попытка получить сообщения
        await MessageService.getChatMessages(chatId);
        setConnectionStatus("connected");
      } catch (error) {
        console.error("Connection check failed:", error);
        setConnectionStatus("error");
      }
    };

    // Проверяем соединение при монтировании и при изменении AppState
    checkConnection();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App became active, checking connection...");
        checkConnection();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [chatId]);

  // Проверка статуса Firebase при монтировании
  useEffect(() => {
    const checkFirebaseConnection = async () => {
      try {
        console.log("Checking Firebase connection...");

        // Проверяем, что есть соединение с Firestore
        if (!firestore) {
          console.error("Firestore not initialized");
          setConnectionStatus("error");
          setInitializing(false);
          return;
        }

        // Простая проверка - получение текущего времени с сервера
        if (!chatId) {
          console.error("No chat ID provided");
          setConnectionStatus("error");
          setInitializing(false);
          return;
        }

        // Запрашиваем один документ для проверки соединения
        await MessageService.getChatMessages(chatId);

        console.log("Firebase connection successful");
        setConnectionStatus("connected");
        setInitializing(false);
      } catch (error) {
        console.error("Firebase connection failed:", error);
        setConnectionStatus("error");
        setInitializing(false);
      }
    };

    checkFirebaseConnection();
  }, [chatId]);

  // Создаём динамические стили на основе текущей темы
  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginLeft: 10,
      color: colors.text,
    },
    messagesList: {
      flex: 1,
      padding: 10,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginRight: 10,
      color: colors.text,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    messageRow: {
      marginBottom: 10,
    },
    ownMessageBubble: {
      backgroundColor: colors.primary,
      borderRadius: 15,
      padding: 10,
      marginLeft: 70,
      marginRight: 10,
      alignSelf: "flex-end",
      maxWidth: "70%",
    },
    otherMessageBubble: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 10,
      marginRight: 70,
      marginLeft: 10,
      borderColor: colors.border,
      borderWidth: 1,
      alignSelf: "flex-start",
      maxWidth: "70%",
    },
    ownMessageText: {
      color: "#fff",
    },
    otherMessageText: {
      color: colors.text,
    },
    messageTime: {
      fontSize: 12,
      color: colors.textSecondary,
      alignSelf: "flex-end",
      marginTop: 5,
    },
    typingIndicator: {
      flexDirection: "row",
      padding: 10,
      marginBottom: 10,
      alignItems: "center",
    },
    typingDot: {
      width: 8,
      height: 8,
      backgroundColor: colors.textSecondary,
      borderRadius: 4,
      marginHorizontal: 2,
    },
    typingText: {
      fontSize: 12,
      marginLeft: 5,
      color: colors.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    imageContainer: {
      borderRadius: 15,
      overflow: "hidden",
      marginVertical: 5,
    },
    imageMessage: {
      width: 220,
      height: 220,
      borderRadius: 15,
    },
    photoButton: {
      marginRight: 10,
      padding: 5,
    },
    photoIcon: {
      width: 24,
      height: 24,
    },
  });

  // Рендер элемента сообщения
  const renderMessageItem = ({ item }: { item: MessageData }) => {
    console.log(`Rendering message ${item.id}:`, item);

    // Безопасно получаем senderId, т.к. это критичный параметр
    const senderId = item.senderId || "unknown";
    const isOwn = senderId === currentUser?.uid;

    // Проверяем, является ли сообщение временным (в процессе отправки)
    const isSending = item.id.startsWith("temp_");

    // Безопасное форматирование времени
    let messageTime = "";
    try {
      messageTime = item.timestamp ? formatMessageTime(item.timestamp) : "";
    } catch (error) {
      console.error("Error formatting time:", error);
      messageTime = "???";
    }

    // Определяем стили для сообщения
    const containerStyle = {
      padding: 8,
      marginVertical: 4,
      maxWidth: "70%",
      minWidth: 80,
      borderRadius: 16,
      alignSelf: isOwn ? "flex-end" : "flex-start",
      backgroundColor: isOwn ? colors.primary : colors.surface,
      borderColor: !isOwn ? colors.border : undefined,
      borderWidth: !isOwn ? 1 : 0,
      marginRight: isOwn ? 10 : 40,
      marginLeft: !isOwn ? 10 : 40,
      // Добавляем полупрозрачность для сообщений в процессе отправки
      opacity: isSending ? 0.7 : 1,
    };

    const textStyle = {
      color: isOwn ? "#fff" : colors.text,
      fontSize: 16,
    };

    const timeStyle = {
      fontSize: 12,
      color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary,
      alignSelf: "flex-end",
      marginTop: 4,
      // Добавляем индикатор отправки
      display: "flex",
      flexDirection: "row" as "row",
      alignItems: "center",
    };

    // Создаем индикатор отправки
    const renderSendingIndicator = () => {
      if (!isSending) return null;

      return (
        <View style={{ marginRight: 5 }}>
          <ActivityIndicator
            size="small"
            color={isOwn ? "#fff" : colors.primary}
          />
        </View>
      );
    };

    // Отображение текстового сообщения
    if (item.type === "text") {
      return (
        <View style={{ marginBottom: 8 }}>
          <View style={containerStyle}>
            <Text style={textStyle}>{item.text || "Пустое сообщение"}</Text>
            <View style={timeStyle}>
              {renderSendingIndicator()}
              <Text
                style={{
                  color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary,
                }}
              >
                {isSending ? "Отправка..." : messageTime}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Отображение изображения
    if (item.type === "image" && item.fileURL) {
      return (
        <View style={{ marginBottom: 8 }}>
          <View style={containerStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => handleDownloadImage(item.fileURL || "")}
            >
              <Image
                source={{ uri: item.fileURL }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 12,
                  marginBottom: 4,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={timeStyle}>
              {renderSendingIndicator()}
              <Text
                style={{
                  color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary,
                }}
              >
                {isSending ? "Отправка..." : messageTime}
              </Text>
            </View>
          </View>
        </View>
      );
    } else if (item.type === "image") {
      // Изображение без URL
      return (
        <View style={{ marginBottom: 8 }}>
          <View style={containerStyle}>
            <Text style={textStyle}>Изображение не доступно</Text>
            <View style={timeStyle}>
              {renderSendingIndicator()}
              <Text
                style={{
                  color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary,
                }}
              >
                {isSending ? "Отправка..." : messageTime}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Неизвестный тип сообщения
    return (
      <View style={{ marginBottom: 8 }}>
        <View style={containerStyle}>
          <Text style={textStyle}>Неизвестный тип сообщения</Text>
          <View style={timeStyle}>
            {renderSendingIndicator()}
            <Text
              style={{
                color: isOwn ? "rgba(255,255,255,0.7)" : colors.textSecondary,
              }}
            >
              {isSending ? "Отправка..." : messageTime}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Начальный экран загрузки
  if (initializing) {
    return (
      <View
        style={[
          themedStyles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.text, marginBottom: 20, fontSize: 16 }}>
          Подключение к чату...
        </Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Обработка ошибки подключения
  if (connectionStatus === "error" && !loading) {
    return (
      <View
        style={[
          themedStyles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={{
            backgroundColor: colors.error,
            padding: 20,
            borderRadius: 10,
            alignItems: "center",
            width: "80%",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 10 }}>
            Ошибка подключения к чату
          </Text>
          <Text
            style={{ color: "#fff", textAlign: "center", marginBottom: 20 }}
          >
            Не удалось загрузить сообщения. Проверьте подключение к интернету.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 5,
              minWidth: 150,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.error, fontWeight: "bold" }}>
              Повторить попытку
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 15,
              padding: 10,
            }}
          >
            <Text style={{ color: "#fff", textDecorationLine: "underline" }}>
              Вернуться назад
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={themedStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 60}
    >
      {connectionStatus === "error" && (
        <View
          style={{
            backgroundColor: colors.error,
            padding: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Проблема с подключением</Text>
          <TouchableOpacity onPress={onRefresh} style={{ marginTop: 5 }}>
            <Text style={{ color: "#fff", textDecorationLine: "underline" }}>
              Повторить попытку
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          style={[{ flex: 1 }, themedStyles.messagesList]}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            padding: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <View style={themedStyles.inputContainer}>
        <TouchableOpacity
          style={themedStyles.photoButton}
          onPress={handlePickImage}
        >
          <Text style={{ fontSize: 24, color: colors.primary }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={themedStyles.textInput}
          placeholder="Введите сообщение..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={handleTextChange}
          multiline
        />
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            style={[
              themedStyles.sendButton,
              !text.trim() && !downloadingUri && { opacity: 0.5 },
            ]}
            onPress={handleSendMessage}
            disabled={sending || (!text.trim() && !downloadingUri)}
          >
            <Text style={{ color: "#fff" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

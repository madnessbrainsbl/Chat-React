import React, { useState, useEffect, useRef } from 'react';
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
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MessageService, ChatService, MessageData } from '../services/firebase';

interface ChatScreenProps {
  route: {
    params: {
      chatId: string;
      userId: string;
      userName: string;
    }
  };
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { chatId, userId, userName } = route.params;
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Получение текущего пользователя
  const currentUser = ChatService.getCurrentUser();

  useEffect(() => {
    // Установка заголовка чата
    navigation.setOptions({ title: userName });
    
    if (!currentUser || !chatId) return;
    
    // Подписка на обновления сообщений
    const unsubscribe = MessageService.onChatMessagesUpdate(chatId, (updatedMessages) => {
      setMessages(updatedMessages);
      setLoading(false);
      
      // Прокрутка к последнему сообщению
      setTimeout(() => {
        if (flatListRef.current && updatedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    });
    
    return () => unsubscribe();
  }, [chatId, currentUser, navigation, userName]);

  // Отправка текстового сообщения
  const handleSendMessage = async () => {
    if (!text.trim() || !currentUser || !chatId) return;
    
    try {
      await MessageService.sendTextMessage(chatId, currentUser.uid, text.trim());
      setText('');
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    }
  };

  // Выбор и отправка изображения
  const handleSendImage = async () => {
    if (!currentUser || !chatId) return;
    
    try {
      // Запрос разрешения на доступ к галерее
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Необходимо разрешение на доступ к галерее');
        return;
      }
      
      // Выбор изображения
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSending(true);
        
        // Отправка изображения
        await MessageService.sendImageMessage(chatId, currentUser.uid, result.assets[0].uri);
        
        setSending(false);
      }
    } catch (error) {
      console.error('Ошибка при отправке изображения:', error);
      Alert.alert('Ошибка', 'Не удалось отправить изображение');
      setSending(false);
    }
  };

  // Определение, является ли сообщение отправленным текущим пользователем
  const isOwnMessage = (message: MessageData) => {
    return message.senderId === currentUser?.uid;
  };

  // Форматирование времени сообщения
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Рендер элемента сообщения
  const renderMessageItem = ({ item }: { item: MessageData }) => {
    const own = isOwnMessage(item);
    
    return (
      <View style={[
        styles.messageContainer,
        own ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          own ? styles.ownMessageBubble : styles.otherMessageBubble,
          item.type === 'image' ? styles.imageBubble : {}
        ]}>
          {item.type === 'text' ? (
            <Text style={styles.messageText}>{item.text}</Text>
          ) : item.type === 'image' && item.fileURL ? (
            <TouchableOpacity 
              onPress={() => {
                // Можно добавить просмотр изображения в полноэкранном режиме
              }}
            >
              <Image 
                source={{ uri: item.fileURL }} 
                style={styles.messageImage} 
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}
          
          <Text style={styles.messageTime}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A86E8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {sending && (
        <View style={styles.sendingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.sendingText}>Отправка изображения...</Text>
        </View>
      )}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет сообщений</Text>
            <Text style={styles.emptySubtext}>Начните общение прямо сейчас</Text>
          </View>
        }
      />
      
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleSendImage}
          disabled={sending}
        >
          <Text style={styles.attachButtonText}>📷</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Введите сообщение..."
          value={text}
          onChangeText={setText}
          multiline
        />
        
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Отправить</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 15,
    padding: 10,
    minWidth: 80,
  },
  imageBubble: {
    padding: 5,
    overflow: 'hidden',
  },
  ownMessageBubble: {
    backgroundColor: '#DCF8C6',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  attachButton: {
    marginRight: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#4A86E8',
    borderRadius: 20,
    paddingHorizontal: 15,
    justifyContent: 'center',
    height: 40,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sendingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default ChatScreen;

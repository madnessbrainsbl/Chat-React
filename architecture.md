# Архитектура мобильного чат-приложения

## Структура базы данных (Firebase)

### Коллекции Firestore

#### 1. users
Хранит информацию о пользователях:
```
users/{userId}
{
  uid: string,          // ID пользователя (совпадает с ID аутентификации)
  email: string,        // Email пользователя
  displayName: string,  // Отображаемое имя
  photoURL: string,     // Ссылка на аватар пользователя
  createdAt: timestamp, // Дата создания аккаунта
  lastSeen: timestamp,  // Последний раз онлайн
  status: string        // Статус пользователя (online/offline)
}
```

#### 2. chats
Хранит информацию о чатах между пользователями:
```
chats/{chatId}
{
  participants: [userId1, userId2],  // Массив ID участников чата
  createdAt: timestamp,              // Дата создания чата
  lastMessage: {                     // Информация о последнем сообщении
    text: string,                    // Текст последнего сообщения
    senderId: string,                // ID отправителя
    timestamp: timestamp,            // Время отправки
    type: string                     // Тип сообщения (text/image)
  }
}
```

#### 3. messages
Хранит сообщения в чатах:
```
chats/{chatId}/messages/{messageId}
{
  senderId: string,     // ID отправителя
  text: string,         // Текст сообщения (может быть пустым для файлов)
  timestamp: timestamp, // Время отправки
  type: string,         // Тип сообщения (text/image)
  fileURL: string,      // Ссылка на файл (для сообщений с файлами)
  read: boolean         // Прочитано ли сообщение
}
```

### Firebase Storage
Используется для хранения файлов:
- `/avatars/{userId}` - аватары пользователей
- `/chat-images/{chatId}/{messageId}` - изображения, отправленные в чатах

### Firebase Authentication
Используется для регистрации и авторизации пользователей с помощью email/password.

## Компоненты приложения

### Экраны
1. **AuthScreen** - экран авторизации/регистрации
   - Компоненты: LoginForm, RegisterForm, AuthHeader
   
2. **ChatListScreen** - список чатов пользователя
   - Компоненты: ChatList, ChatListItem, SearchBar, AppHeader
   
3. **ChatScreen** - экран чата с конкретным пользователем
   - Компоненты: MessageList, MessageItem, MessageInput, ChatHeader
   
4. **UserListScreen** - список всех пользователей для поиска
   - Компоненты: UserList, UserListItem, SearchBar, AppHeader
   
5. **ProfileScreen** - профиль пользователя
   - Компоненты: ProfileHeader, ProfileForm, AvatarPicker

### Сервисы
1. **AuthService** - управление аутентификацией
2. **ChatService** - управление чатами и сообщениями
3. **UserService** - управление пользователями
4. **StorageService** - управление файлами

## Схема навигации

```
App
├── AuthStack (если пользователь не авторизован)
│   ├── LoginScreen
│   └── RegisterScreen
└── MainStack (если пользователь авторизован)
    ├── TabNavigator
    │   ├── ChatListScreen
    │   ├── UserListScreen
    │   └── ProfileScreen
    └── ChatScreen (открывается из ChatListScreen)
```

## Основные функции

1. **Аутентификация**
   - Регистрация нового пользователя
   - Вход существующего пользователя
   - Выход из аккаунта

2. **Управление чатами**
   - Создание нового чата
   - Получение списка чатов пользователя
   - Удаление чата

3. **Обмен сообщениями**
   - Отправка текстовых сообщений
   - Отправка изображений
   - Получение сообщений в реальном времени

4. **Управление пользователями**
   - Поиск пользователей по имени
   - Просмотр профилей пользователей
   - Обновление своего профиля

5. **Управление файлами**
   - Загрузка аватара
   - Отправка изображений в чате
   - Просмотр изображений

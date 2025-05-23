// Mock Firebase services for offline development

export interface User {
  uid: string;
  email: string;
  displayName: string;
}

const dummyUser: User = {
  uid: "1",
  email: "test@example.com",
  displayName: "Test User",
};

export const AuthService = {
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<User> {
    console.log("Mock register", email, displayName);
    return dummyUser;
  },
  async login(email: string, password: string): Promise<User> {
    console.log("Mock login", email);
    return dummyUser;
  },
  async logout(): Promise<void> {
    console.log("Mock logout");
  },
  async updateProfile(
    userId: string,
    data: { displayName?: string }
  ): Promise<void> {
    console.log("Mock AuthService.updateProfile", userId, data);
    if (data.displayName) {
      dummyUser.displayName = data.displayName;
      // Persist displayName in mockUsers
      const idx = mockUsers.findIndex((u) => u.uid === userId);
      if (idx >= 0) mockUsers[idx].displayName = data.displayName;
    }
  },
  getCurrentUser(): User | null {
    return dummyUser;
  },
  onAuthStateChanged(callback: (user: User | null) => void) {
    console.log("Mock onAuthStateChanged");
    callback(dummyUser);
    return () => {};
  },
};

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

// In-memory mock users store for offline testing
const mockUsers: UserData[] = [
  {
    uid: dummyUser.uid,
    email: dummyUser.email,
    displayName: dummyUser.displayName,
    photoURL: undefined,
  },
  {
    uid: "2",
    email: "alice@example.com",
    displayName: "Alice",
    photoURL: undefined,
  },
  {
    uid: "3",
    email: "bob@example.com",
    displayName: "Bob",
    photoURL: undefined,
  },
];

export const UserService = {
  async getUserData(userId: string): Promise<UserData | null> {
    console.log("Mock getUserData", userId);
    return mockUsers.find((u) => u.uid === userId) || null;
  },
  async updateUserData(userId: string, data: Partial<UserData>): Promise<void> {
    console.log("Mock updateUserData", userId, data);
  },
  async searchUsersByName(name: string): Promise<UserData[]> {
    console.log("Mock searchUsersByName", name);
    return mockUsers.filter((user) =>
      user.displayName.toLowerCase().includes(name.toLowerCase())
    );
  },
  async getAllUsers(): Promise<UserData[]> {
    console.log("Mock getAllUsers");
    return mockUsers;
  },
  async uploadAvatar(userId: string, uri: string): Promise<string> {
    console.log("Mock uploadAvatar", userId, uri);
    // Persist photoURL in mockUsers
    const idx = mockUsers.findIndex((u) => u.uid === userId);
    if (idx >= 0) mockUsers[idx].photoURL = uri;
    return uri;
  },
  async addUser(email: string, displayName: string): Promise<UserData> {
    console.log("Mock addUser", email, displayName);
    const uid = Date.now().toString();
    const newUser: UserData = { uid, email, displayName, photoURL: undefined };
    mockUsers.push(newUser);
    return newUser;
  },
};

export interface ChatData {
  id?: string;
  participants?: string[];
  createdAt?: any;
  lastMessage?: any;
}

// In-memory mock chats and subscriptions for offline testing
const mockChats: Record<string, ChatData[]> = {};
const chatSubscribers: Record<string, ((chats: ChatData[]) => void)[]> = {};

// In-memory message store and subscriptions for offline testing
export interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: { toDate: () => Date };
  type: "text" | "image";
  fileURL?: string;
  read?: boolean;
}
const mockMessages: Record<string, MessageData[]> = {};
const messageSubscribers: Record<
  string,
  ((messages: MessageData[]) => void)[]
> = {};

export const ChatService = {
  async createChat(
    currentUserId: string,
    otherUserId: string
  ): Promise<string> {
    console.log("Mock createChat", currentUserId, otherUserId);
    // Prevent duplicate chats between the same participants
    const existing = await this.getChatByParticipants(
      currentUserId,
      otherUserId
    );
    if (existing?.id) {
      return existing.id;
    }
    const chatId = Date.now().toString();
    const now = { toDate: () => new Date() };
    const chat: ChatData = {
      id: chatId,
      participants: [currentUserId, otherUserId],
      createdAt: now,
      lastMessage: { text: "", senderId: "", timestamp: now, type: "text" },
    };
    [currentUserId, otherUserId].forEach((userId) => {
      if (!mockChats[userId]) mockChats[userId] = [];
      mockChats[userId].push(chat);
      (chatSubscribers[userId] || []).forEach((cb) =>
        cb([...mockChats[userId]])
      );
    });
    return chatId;
  },
  async getChatById(chatId: string): Promise<ChatData | null> {
    console.log("Mock getChatById", chatId);
    return null;
  },
  async getChatByParticipants(
    userId1: string,
    userId2: string
  ): Promise<ChatData | null> {
    console.log("Mock getChatByParticipants", userId1, userId2);
    // Find existing chat for these participants
    const chats = mockChats[userId1] || [];
    const chat = chats.find((c) => c.participants?.includes(userId2));
    return chat || null;
  },
  async getUserChats(userId: string): Promise<ChatData[]> {
    console.log("Mock getUserChats", userId);
    return mockChats[userId] || [];
  },
  onUserChatsUpdate(userId: string, callback: (chats: ChatData[]) => void) {
    console.log("Mock onUserChatsUpdate", userId);
    if (!chatSubscribers[userId]) chatSubscribers[userId] = [];
    chatSubscribers[userId].push(callback);
    callback(mockChats[userId] || []);
    return () => {
      chatSubscribers[userId] = chatSubscribers[userId].filter(
        (cb) => cb !== callback
      );
    };
  },
  async deleteChat(chatId: string): Promise<void> {
    console.log("Mock deleteChat", chatId);
  },
  async sendTextMessage(
    chatId: string,
    senderId: string,
    text: string
  ): Promise<string> {
    const message: MessageData = {
      id: Date.now().toString(),
      senderId,
      text,
      timestamp: { toDate: () => new Date() },
      type: "text",
      read: false,
    };
    if (!mockMessages[chatId]) mockMessages[chatId] = [];
    mockMessages[chatId].push(message);
    (messageSubscribers[chatId] || []).forEach((cb) =>
      cb([...mockMessages[chatId]])
    );
    return message.id;
  },
  async sendImageMessage(
    chatId: string,
    senderId: string,
    uri: string
  ): Promise<string> {
    const message: MessageData = {
      id: Date.now().toString(),
      senderId,
      text: "",
      timestamp: { toDate: () => new Date() },
      type: "image",
      fileURL: uri,
      read: false,
    };
    if (!mockMessages[chatId]) mockMessages[chatId] = [];
    mockMessages[chatId].push(message);
    (messageSubscribers[chatId] || []).forEach((cb) =>
      cb([...mockMessages[chatId]])
    );
    return message.id;
  },
  async getChatMessages(chatId: string): Promise<MessageData[]> {
    return mockMessages[chatId] || [];
  },
  onChatMessagesUpdate(
    chatId: string,
    callback: (messages: MessageData[]) => void
  ) {
    if (!messageSubscribers[chatId]) messageSubscribers[chatId] = [];
    messageSubscribers[chatId].push(callback);
    callback(mockMessages[chatId] || []);
    return () => {
      messageSubscribers[chatId] = messageSubscribers[chatId].filter(
        (cb) => cb !== callback
      );
    };
  },
  async markMessageAsRead(chatId: string, messageId: string): Promise<void> {
    console.log("Mock markMessageAsRead", chatId, messageId);
  },
  getCurrentUser(): User | null {
    console.log("Mock ChatService.getCurrentUser");
    return dummyUser;
  },
};

export const MessageService = ChatService;

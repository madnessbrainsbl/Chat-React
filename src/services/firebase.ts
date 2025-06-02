import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import * as FileSystem from "expo-file-system";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_API_KEY>",
  authDomain: "<YOUR_FIREBASE_AUTH_DOMAIN>",
  projectId: "<YOUR_FIREBASE_PROJECT_ID>",
  storageBucket: "<YOUR_FIREBASE_STORAGE_BUCKET>",
  messagingSenderId: "<YOUR_FIREBASE_MESSAGING_SENDER_ID>",
  appId: "<YOUR_FIREBASE_APP_ID>",
};

// Отдельная функция инициализации Firebase
const initializeFirebase = () => {
  try {
    console.log("Initializing Firebase...");

    if (firebase.apps.length > 0) {
      console.log("Firebase already initialized, using existing app");
      return firebase.apps[0];
    }

    const app = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully!");
    return app;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // Можно добавить запись ошибки в файл
    const errorMsg = `Firebase initialization error: ${
      error instanceof Error ? error.message : String(error)
    }\n`;
    try {
      // Только при наличии FileSystem
      const logPath = FileSystem.documentDirectory
        ? `${FileSystem.documentDirectory}/firebase_error.log`
        : null;

      if (logPath) {
        FileSystem.writeAsStringAsync(logPath, errorMsg, {
          encoding: FileSystem.EncodingType.UTF8,
        }).catch((e) => console.error("Could not write error log:", e));
      }
    } catch (e) {
      console.error("Error writing log:", e);
    }

    // Выбрасываем ошибку для дальнейшей обработки
    throw new Error(
      `Firebase failed to initialize: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// Initialize Firebase
let firebaseApp;
try {
  firebaseApp = initializeFirebase();
} catch (error) {
  console.error("Could not initialize Firebase on startup:", error);
  // Приложение должно обработать эту ошибку на верхнем уровне
}

// Configure Firebase Auth persistence
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL); // disabled for React Native to avoid setItem undefined error

// Export Firebase services
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();

// Interfaces
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: firebase.firestore.Timestamp;
  lastSeen: firebase.firestore.Timestamp;
  status: "online" | "offline";
}

export interface ChatData {
  id: string;
  participants: string[];
  createdAt: Timestamp;
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
    type: "text" | "image";
  };
}

export interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  type: "text" | "image";
  fileURL?: string;
  read: boolean;
}

// AuthService
export const AuthService = {
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<firebase.User | null> {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        await user.updateProfile({ displayName });
        await firestore.collection("users").doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          displayName,
          createdAt: firebase.firestore.Timestamp.now(),
          lastSeen: firebase.firestore.Timestamp.now(),
          status: "online",
        });
      }

      return user;
    } catch (error) {
      console.error("Registration error:", error);
      return null;
    }
  },

  async login(email: string, password: string): Promise<firebase.User | null> {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;
      if (user) {
        await auth.currentUser?.reload();
        // Обновляем Firestore
        await firestore.collection("users").doc(user.uid).set(
          {
            lastSeen: firebase.firestore.Timestamp.now(),
            status: "online",
          },
          { merge: true }
        );
      }
      return user;
    } catch (e) {
      console.error("Login error:", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(firestore, "users", user.uid), {
        lastSeen: Timestamp.now(),
        status: "offline",
      });
    }
    await auth.signOut();
  },

  getCurrentUser(): firebase.User | null {
    return auth.currentUser;
  },

  async updateProfile(
    userId: string,
    data: { displayName?: string; photoURL?: string }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user || user.uid !== userId) throw new Error("Not authorized");
    // Update Auth profile
    await user.updateProfile(data);
    // Update Firestore compat document, merge data to create if missing
    await firestore.collection("users").doc(userId).set(data, { merge: true });
  },

  onAuthStateChanged(callback: (user: firebase.User | null) => void) {
    return auth.onAuthStateChanged(callback);
  },
};

// UserService
export const UserService = {
  async addUser(email: string, displayName: string): Promise<string> {
    const q = query(
      collection(firestore, "users"),
      where("email", "==", email)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      const error: any = new Error("Email already in use");
      error.code = "auth/email-already-in-use";
      throw error;
    }
    const docRef = await addDoc(collection(firestore, "users"), {
      email,
      displayName,
      createdAt: Timestamp.now(),
      lastSeen: Timestamp.now(),
      status: "offline",
    });
    await updateDoc(docRef, { uid: docRef.id });
    return docRef.id;
  },

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(firestore, "users", userId));
  },

  async getUserData(userId: string): Promise<UserData | null> {
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (!userDoc.exists()) return null;
    const data = userDoc.data() as Omit<UserData, "uid">;
    return { uid: userDoc.id, ...data };
  },

  async updateUserData(userId: string, data: Partial<UserData>): Promise<void> {
    // Update Firestore compat document, merge data to create if missing
    await firestore.collection("users").doc(userId).set(data, { merge: true });
  },

  async searchUsersByName(name: string): Promise<UserData[]> {
    const usersQuery = query(
      collection(firestore, "users"),
      where("displayName", ">=", name),
      where("displayName", "<=", name + "\uf8ff")
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map((d) => {
      const data = d.data() as Omit<UserData, "uid">;
      return { uid: d.id, ...data };
    });
  },

  async getAllUsers(): Promise<UserData[]> {
    const snapshot = await getDocs(collection(firestore, "users"));
    return snapshot.docs.map((d) => {
      const data = d.data() as Omit<UserData, "uid">;
      return { uid: d.id, ...data };
    });
  },

  async uploadAvatar(userId: string, uri: string): Promise<string> {
    try {
      // Upload avatar to Cloudinary
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: `${userId}_${Date.now()}.jpg`,
      } as any);
      formData.append("upload_preset", "YOUR_UPLOAD_PRESET");
      const cloudName = "YOUR_CLOUD_NAME";
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      const downloadURL = data.secure_url;

      // Update Auth profile
      const user = auth.currentUser;
      if (user) {
        await user.updateProfile({ photoURL: downloadURL });
      }
      // Update Firestore user document
      await firestore
        .collection("users")
        .doc(userId)
        .set({ photoURL: downloadURL }, { merge: true });
      return downloadURL;
    } catch (error) {
      console.error("Ошибка при загрузке аватара в Cloudinary:", error);
      throw error;
    }
  },

  async uploadImageToStorage(
    uri: string,
    fileName: string,
    folder: string = "avatars"
  ): Promise<string> {
    try {
      console.log(`Загрузка файла ${fileName} в папку ${folder}`);

      // Проверяем, существует ли файл
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error(`File not found: ${uri}`);
      }

      if (fileInfo.size === 0) {
        throw new Error(`File is empty: ${uri}`);
      }

      console.log(`File exists and has size: ${fileInfo.size} bytes`);

      // Создаем ссылку в Firebase Storage
      const storageRef = storage.ref(`${folder}/${fileName}`);

      // Подготавливаем файл для загрузки
      const response = await fetch(uri);

      if (!response.ok) {
        throw new Error(`Failed to fetch local file: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Created blob is empty");
      }

      // Загружаем файл
      console.log(
        `Uploading blob of size: ${blob.size} bytes to Firebase Storage...`
      );
      const uploadTask = await storageRef.put(blob);

      // Получаем URL для загруженного файла
      const downloadURL = await uploadTask.ref.getDownloadURL();
      console.log("Файл успешно загружен:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("Ошибка при загрузке файла в Firebase Storage:", error);
      throw error;
    }
  },
};

// ChatService с функциями набора текста
export const ChatService = {
  async createChat(
    currentUserId: string,
    otherUserId: string
  ): Promise<string> {
    if (!otherUserId) {
      throw new Error("Неверный идентификатор второго участника чата");
    }
    const existing = await this.getChatByParticipants(
      currentUserId,
      otherUserId
    );
    if (existing) return existing.id;
    const participants = [currentUserId, otherUserId];
    const chatRef = await addDoc(collection(firestore, "chats"), {
      participants,
      createdAt: Timestamp.now(),
      lastMessage: {
        text: "",
        senderId: currentUserId,
        timestamp: Timestamp.now(),
        type: "text",
      },
    });
    return chatRef.id;
  },

  async getChatByParticipants(
    userId1: string,
    userId2: string
  ): Promise<ChatData | null> {
    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", userId1)
    );
    const snapshot = await getDocs(chatsQuery);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as ChatData;
      if (data.participants.includes(userId2)) {
        return { ...data, id: docSnap.id };
      }
    }
    return null;
  },

  async getUserChats(userId: string): Promise<ChatData[]> {
    // Query chats where current user is a participant
    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", userId)
    );
    const snapshot = await getDocs(chatsQuery);
    // Map and sort by lastMessage.timestamp descending
    const chats = snapshot.docs.map((d) => ({
      ...(d.data() as ChatData),
      id: d.id,
    }));
    return chats.sort(
      (a, b) =>
        b.lastMessage.timestamp.toMillis() - a.lastMessage.timestamp.toMillis()
    );
  },

  onUserChatsUpdate(userId: string, callback: (chats: ChatData[]) => void) {
    const chatsQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", userId)
    );
    return onSnapshot(chatsQuery, (snapshot) => {
      const chats = snapshot.docs
        .map((d) => ({ ...(d.data() as ChatData), id: d.id }))
        .sort(
          (a, b) =>
            b.lastMessage.timestamp.toMillis() -
            a.lastMessage.timestamp.toMillis()
        );
      callback(chats);
    });
  },

  async sendTextMessage(
    chatId: string,
    senderId: string,
    text: string
  ): Promise<string> {
    console.log(`Sending text message to chat ${chatId}`);

    // Проверяем, не пустой ли текст
    if (!text || text.trim() === "") {
      text = "Пустое сообщение";
    }

    try {
      const message = {
        senderId,
        text,
        timestamp: Timestamp.now(),
        type: "text",
        read: false,
      };

      console.log("Message object being sent:", message);

      const msgRef = await addDoc(
        collection(firestore, `chats/${chatId}/messages`),
        message
      );

      console.log(`Message added with ID: ${msgRef.id}`);

      await updateDoc(doc(firestore, "chats", chatId), {
        lastMessage: {
          text,
          senderId,
          timestamp: Timestamp.now(),
          type: "text",
        },
      });

      return msgRef.id;
    } catch (error) {
      console.error("Error sending text message:", error);
      throw error;
    }
  },

  async sendImageMessage(
    chatId: string,
    senderId: string,
    uri: string
  ): Promise<string> {
    try {
      console.log(`Sending image message to chat ${chatId} with URI: ${uri}`);

      // Используем переданный URI напрямую без загрузки в Storage
      const fileURL = uri;

      // Сохраняем сообщение в Firestore
      const message = {
        senderId,
        timestamp: Timestamp.now(),
        type: "image",
        fileURL,
        read: false,
        text: "🖼️ Изображение", // Текст для превью
      };

      console.log("Image message object being sent:", message);

      const msgRef = await addDoc(
        collection(firestore, `chats/${chatId}/messages`),
        message
      );

      console.log(`Image message added with ID: ${msgRef.id}`);

      // Обновляем последнее сообщение в чате
      await updateDoc(doc(firestore, "chats", chatId), {
        lastMessage: {
          text: "🖼️ Изображение",
          senderId,
          timestamp: Timestamp.now(),
          type: "image",
        },
      });

      return msgRef.id;
    } catch (error) {
      console.error("Ошибка при отправке изображения:", error);
      throw error;
    }
  },

  async getChatMessages(chatId: string): Promise<MessageData[]> {
    const msgs = await getDocs(
      query(
        collection(firestore, `chats/${chatId}/messages`),
        orderBy("timestamp", "asc")
      )
    );
    return msgs.docs.map((d) => ({ ...(d.data() as MessageData), id: d.id }));
  },

  onChatMessagesUpdate(
    chatId: string,
    callback: (msgs: MessageData[]) => void
  ) {
    console.log(`Setting up messages listener for chat ID: ${chatId}`);

    const msgsQuery = query(
      collection(firestore, `chats/${chatId}/messages`),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(
      msgsQuery,
      (snapshot) => {
        console.log(`Got message update with ${snapshot.docs.length} messages`);

        const msgs = snapshot.docs.map((d) => {
          const data = d.data();
          console.log(`Message data for ${d.id}:`, data);

          // Проверяем обязательные поля
          if (!data.senderId || !data.timestamp) {
            console.warn(`Message ${d.id} is missing required fields:`, data);
          }

          // Гарантируем, что все поля заполнены корректными значениями
          const messageData: MessageData = {
            id: d.id,
            senderId: data.senderId || "unknown",
            text: data.text || "",
            timestamp: data.timestamp || Timestamp.now(),
            type: data.type || "text",
            fileURL: data.fileURL || undefined,
            read: data.read || false,
          };

          return messageData;
        });

        callback(msgs);
      },
      (error) => {
        console.error(`Error in message listener for chat ${chatId}:`, error);
        // Возвращаем пустой массив в случае ошибки, чтобы UI не крашнулся
        callback([]);
      }
    );
  },

  async markMessageAsRead(chatId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(firestore, "chats", chatId, "messages", messageId);
      await updateDoc(messageRef, { read: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  },

  // Функции для отслеживания набора текста
  async updateTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    try {
      const typingRef = doc(firestore, "chats", chatId, "typing", userId);
      await setDoc(typingRef, {
        isTyping: isTyping,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  },

  // Подписка на изменение статуса набора текста
  onTypingStatusChange(
    chatId: string,
    userId: string,
    callback: (isTyping: boolean) => void
  ) {
    const typingRef = doc(firestore, "chats", chatId, "typing", userId);

    return onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.isTyping || false);
      } else {
        callback(false);
      }
    });
  },
};

// Создаем MessageService как алиас для совместимости со старым кодом
export const MessageService = ChatService;

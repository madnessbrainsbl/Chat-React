# MobileChatApp

A cross-platform mobile chat application built with React Native and Expo, featuring real-time messaging, image sharing, user profiles, theming, and local notifications.

## Features

- **Authentication & Registration**: Secure email/password login powered by Firebase Authentication.
- **Real-Time Chat**: One-on-one messaging backed by Firebase Firestore.
- **Image Sharing**: Send and receive images directly in the chat.
- **User Profiles**: View and update display name and avatar (stored via Cloudinary or local storage).
- **Typing Indicators**: See when your chat partner is typing.
- **Search & New Chats**: Search for other users by name and start new conversations.
- **Theming**: Light, Dark, or System themes with persistent settings.
- **Keyboard Handling**: Inputs are never obscured by the keyboard across iOS and Android.
- **Local Notifications**: Receive in-app push-style alerts for new messages (Expo Go supports only local notifications).

## Screenshots

![image](https://github.com/user-attachments/assets/da193d6a-cbdf-44b0-8bba-f1747e0d5e6e)
![image](https://github.com/user-attachments/assets/a1aaa26d-b25f-40e9-b3ef-78494d5adf2f)
![image](https://github.com/user-attachments/assets/518b5c77-f82e-46a0-84b8-564e62800cf6)
![image](https://github.com/user-attachments/assets/bdf014a4-1131-4ac2-9bd2-5c7271e3eb52)
![image](https://github.com/user-attachments/assets/9ad90bcd-e293-4cd3-b394-23f6c4ad83a3)
![image](https://github.com/user-attachments/assets/28bcff0b-5b8d-4d78-992f-80d768be9566)






## Getting Started

### Prerequisites

- Node.js (>=14.x)
- npm or Yarn
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project (Firestore, Auth, Storage)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/madnessbrainsbl/Chat-React.git
   cd Chat-React
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Configure Firebase
   - Copy your Firebase project settings into `src/services/firebase.ts` (replace placeholders).
4. Configure App Identifiers
   - Update `app.json` with your `slug`, `scheme`, `bundleIdentifier` (iOS), and `package` (Android).

### Running in Development

```bash
expo start
# Press 'i' to open in iOS Simulator or 'a' for Android Emulator
```

For full native module support (e.g. camera, notifications), use a development build:
```bash
eas build --profile development --platform all
```

## Project Structure

```
/ src
  / navigation    # React Navigation stacks and tabs
  / screens       # App screens: Login, Register, ChatList, Chat, Users, Profile
  / services      # Firebase, theming, notifications wrappers
/ assets          # App icons, splash, and demo screenshots
/ App.tsx         # Root component with ThemeProvider and navigator
/ app.json        # Expo configuration
/ README.md       # Project overview and setup
```

## Limitations in Expo Go

- **Push Notifications**: Only local notifications are supported.
- **Media Library**: Some filesystem and album creation APIs are restricted.

To leverage full native capabilities, install on a device with a custom dev client or production build.


const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Expose React Native-specific Firebase Auth module via alias
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-gesture-handler": path.resolve(
    __dirname,
    "node_modules/react-native-gesture-handler"
  ),
  "firebase/app": path.resolve(__dirname, "node_modules/firebase/app"),
  "firebase/auth": path.resolve(__dirname, "node_modules/firebase/auth"),
  "firebase/firestore": path.resolve(
    __dirname,
    "node_modules/firebase/firestore"
  ),
  "firebase/storage": path.resolve(__dirname, "node_modules/firebase/storage"),
};

module.exports = config;

import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Determine host for local server: use debuggerHost if available, else fallback
const debuggerHost = Constants.manifest?.debuggerHost;
let host: string;
if (debuggerHost) {
  // expo packager host (e.g., 192.168.x.x:19000)
  host = debuggerHost.split(":")[0];
} else {
  // default fallback: Android emulator needs 10.0.2.2, others localhost
  host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
}
const BASE_URL = `http://${host}:3000`;

/**
 * Загружает файл на локальный сервер, который пересылает его в Google Drive.
 * @param uri Локальный URI файла (expo-file-system)
 * @param fileName Имя файла на сервере с расширением
 * @returns URL загруженного файла в Google Drive
 */
export async function uploadToGoogleDrive(
  uri: string,
  fileName: string
): Promise<string> {
  console.log("UploadToGoogleDrive: fetching URL ->", `${BASE_URL}/upload`);
  // Определяем MIME-тип по расширению файла
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  let mimeType = "application/octet-stream";
  if (ext === "jpg" || ext === "jpeg") {
    mimeType = "image/jpeg";
  } else if (ext === "png") {
    mimeType = "image/png";
  } else if (ext === "gif") {
    mimeType = "image/gif";
  }

  // Читаем файл в base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Отправляем на сервер
  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ base64, fileName, mimeType }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Ошибка загрузки: ${message}`);
  }

  const data = await response.json();
  return data.url;
}

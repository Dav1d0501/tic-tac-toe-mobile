import { Platform } from "react-native";

const PORT = 3001;

// Detects the backend host from the address the app was served from
const getHost = () => {
  if (Platform.OS === "web") {
    return (typeof window !== "undefined" && window.location?.hostname) || "localhost";
  }
  try {
    const getDevServer = require("react-native/Libraries/Core/Devtools/getDevServer").default;
    const url = getDevServer()?.url || "";
    return url.match(/\/\/([^/:]+)/)?.[1] || null;
  } catch {
    return null;
  }
};

let host = getHost();

// Falls back to a usable host, 10.0.2.2 is the Android emulator alias for the PC
if (!host || host === "localhost" || host === "127.0.0.1") {
  host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

// Explicit env var overrides everything
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || `http://${host}:${PORT}`;

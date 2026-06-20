import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "app_theme";

// Color palettes for the two themes, using the same keys
const palettes = {
  dark: {
    bg: "#0f0c29",
    text: "#ffffff",
    textSecondary: "#d9d2e8",
    textMuted: "#9b93ad",
    placeholder: "#887a7a",
    accent: "#4cc9f0",
    onAccent: "#0f0c29",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.12)",
    inputBg: "rgba(255,255,255,0.08)",
    inputBorder: "rgba(255,255,255,0.15)",
    subtle: "rgba(255,255,255,0.08)",
    danger: "#ff4d4d",
    dangerText: "#ff6b6b",
    success: "#20c997",
    gold: "#E8D754",
    cellBg: "#161229",
    boardBg: "rgba(255,255,255,0.18)",
    boardLine: "rgba(255,255,255,0.18)",
    modalBg: "#1a1730",
    divider: "rgba(255,255,255,0.06)",
    modalOverlay: "rgba(0,0,0,0.6)",
  },
  light: {
    bg: "#eef1f6",
    text: "#1a1730",
    textSecondary: "#3a3550",
    textMuted: "#6b6580",
    placeholder: "#9b93ad",
    accent: "#0ea5c4",
    onAccent: "#ffffff",
    card: "#ffffff",
    cardBorder: "rgba(0,0,0,0.08)",
    inputBg: "#ffffff",
    inputBorder: "rgba(0,0,0,0.15)",
    subtle: "rgba(0,0,0,0.05)",
    danger: "#e03131",
    dangerText: "#e03131",
    success: "#0ca678",
    gold: "#b8860b",
    cellBg: "#ffffff",
    boardBg: "#9aa3b2",
    boardLine: "#9aa3b2",
    modalBg: "#ffffff",
    divider: "rgba(0,0,0,0.08)",
    modalOverlay: "rgba(0,0,0,0.4)",
  },
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("dark");

  // Load the saved theme once when the app starts
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setMode(saved);
    })();
  }, []);

  // Switch between dark and light and remember the choice
  const toggleTheme = async () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ mode, colors: palettes[mode], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;

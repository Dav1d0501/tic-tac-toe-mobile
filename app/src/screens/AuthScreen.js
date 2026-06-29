import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const Character = ({ color, width, height, radius, blink }) => (
  <View
    style={{
      width,
      height,
      backgroundColor: color,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: height * 0.22,
      marginHorizontal: 4,
    }}
  >
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Animated.View style={[styles.eye, { transform: [{ scaleY: blink }] }]} />
      <Animated.View style={[styles.eye, { transform: [{ scaleY: blink }] }]} />
    </View>
  </View>
);

// Row of characters that blink at random times
const Mascot = () => {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      Animated.sequence([
        Animated.delay(2500 + Math.random() * 2500),
        Animated.timing(blink, { toValue: 0.1, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
    return () => {
      mounted = false;
    };
  }, [blink]);

  return (
    <View style={styles.mascotRow}>
      <Character color="#FF9B6B" width={70} height={90} radius={40} blink={blink} />
      <Character color="#800020" width={45} height={120} radius={10} blink={blink} />
      <Character color="#1e1b1b" width={38} height={95} radius={8} blink={blink} />
      <Character color="#E8D754" width={50} height={80} radius={30} blink={blink} />
    </View>
  );
};

const AuthScreen = () => {
  const { login } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const dynamic = useMemo(() => createStyles(colors), [colors]);

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const show = (text, error = true) => {
    setMessage(text);
    setIsError(error);
  };

  // Validates the form, then logs in or registers
  const handleSubmit = async () => {
    setMessage("");

    if (!username.trim()) return show("Please enter a username");
    if (!password) return show("Please enter a password");

    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return show("Please enter a valid email address");
      }
      const strictPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_]).{8,}$/;
      if (!strictPasswordRegex.test(password)) {
        return show("Password must be 8+ chars, 1 Uppercase, 1 Number & 1 Special char");
      }
    }

    const endpoint = isLogin ? "login" : "register";
    const payload = isLogin
      ? { username, password }
      : { username, email, password };

    // Aborts the request if the server does not answer in time
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    setSubmitting(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json();
      if (response.ok) {
        show(`Success! Welcome ${data.username}`, false);
        setTimeout(() => login(data), 600);
      } else {
        show(data.message || "Something went wrong");
      }
    } catch (error) {
      console.error("Auth Error:", error);
      if (error.name === "AbortError") {
        show(`Could not reach server at ${SERVER_URL} (timed out)`);
      } else {
        show(`Network error: ${error.message}, trying ${SERVER_URL}`);
      }
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={dynamic.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={dynamic.brand}>ArenaX</Text>
        <Mascot />

        <View style={dynamic.formCard}>
          <Text style={dynamic.title}>{isLogin ? t("welcomeBack") : t("createAccount")}</Text>
          <Text style={dynamic.subtitle}>
            {isLogin ? t("enterDetails") : t("joinArena")}
          </Text>

          <Text style={dynamic.label}>{t("username")}</Text>
          <TextInput
            style={dynamic.input}
            placeholder={t("playerName")}
            placeholderTextColor={colors.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {!isLogin && (
            <>
              <Text style={dynamic.label}>{t("email")}</Text>
              <TextInput
                style={dynamic.input}
                placeholder="name@example.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </>
          )}

          <Text style={dynamic.label}>{t("password")}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[dynamic.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowPassword((s) => !s)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <Text style={dynamic.hint}>
              {t("passwordHint")}
            </Text>
          )}

          {!!message && (
            <Text style={[styles.message, isError ? dynamic.error : dynamic.success]}>
              {message}
            </Text>
          )}

          <TouchableOpacity
            style={[dynamic.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={dynamic.submitText}>
              {submitting ? "Please wait…" : isLogin ? t("login") : t("register")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggle}
            onPress={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            <Text style={dynamic.toggleText}>
              {isLogin ? t("noAccount") : t("haveAccount")}
              <Text style={dynamic.toggleLink}>{isLogin ? t("signUp") : t("loginLink")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Static styles, not theme based
const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  mascotRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 130,
    marginBottom: 20,
  },
  eye: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#fff" },
  passwordRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  eyeToggle: { paddingHorizontal: 12, paddingVertical: 10, marginLeft: 6 },
  message: { textAlign: "center", marginVertical: 8, fontWeight: "600" },
  toggle: { marginTop: 18, alignItems: "center" },
});

const createStyles = (c) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: c.bg },
    brand: {
      fontSize: 40,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      marginBottom: 10,
      letterSpacing: 1,
    },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 22,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    title: { fontSize: 24, fontWeight: "700", color: c.text, textAlign: "center" },
    subtitle: { fontSize: 14, color: c.textMuted, textAlign: "center", marginBottom: 18 },
    label: { color: c.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    hint: { fontSize: 12, color: c.placeholder, marginBottom: 10 },
    error: { color: c.dangerText },
    success: { color: c.success },
    submitBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 8,
      alignItems: "center",
    },
    submitText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
    toggleText: { color: c.textMuted },
    toggleLink: { color: c.accent, fontWeight: "700" },
  });

export default AuthScreen;

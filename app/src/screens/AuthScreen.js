import { useState, useEffect, useRef } from "react";
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

import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";

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

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const show = (text, error = true) => {
    setMessage(text);
    setIsError(error);
  };

  // Validates the form then logs in or registers against the server
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

    try {
      const response = await fetch(`${SERVER_URL}/api/users/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      show("Server error. Check the SERVER_URL in src/config.js");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ArenaX</Text>
        <Mascot />

        <View style={styles.formCard}>
          <Text style={styles.title}>{isLogin ? "Welcome back!" : "Create Account"}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Please enter your details" : "Join the arena today"}
          </Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Player Name"
            placeholderTextColor="#887a7a"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {!isLogin && (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#887a7a"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </>
          )}

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor="#887a7a"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowPassword((s) => !s)}
            >
              <Text style={{ color: "#cbbcbc" }}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <Text style={styles.hint}>
              Needs: 8+ chars, 1 Uppercase, 1 Number, 1 Special character
            </Text>
          )}

          {!!message && (
            <Text style={[styles.message, isError ? styles.error : styles.success]}>
              {message}
            </Text>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>{isLogin ? "Log in" : "Register"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggle}
            onPress={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.toggleLink}>{isLogin ? "Sign Up" : "Login"}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#0f0c29" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  mascotRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 130,
    marginBottom: 20,
  },
  eye: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#fff" },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#b8b0c8", textAlign: "center", marginBottom: 18 },
  label: { color: "#d9d2e8", fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  passwordRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  eyeToggle: { paddingHorizontal: 12, paddingVertical: 10, marginLeft: 6 },
  hint: { fontSize: 12, color: "#887a7a", marginBottom: 10 },
  message: { textAlign: "center", marginVertical: 8, fontWeight: "600" },
  error: { color: "#ff6b6b" },
  success: { color: "#20c997" },
  submitBtn: {
    backgroundColor: "#4cc9f0",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: "center",
  },
  submitText: { color: "#0f0c29", fontWeight: "800", fontSize: 16 },
  toggle: { marginTop: 18, alignItems: "center" },
  toggleText: { color: "#b8b0c8" },
  toggleLink: { color: "#4cc9f0", fontWeight: "700" },
});

export default AuthScreen;

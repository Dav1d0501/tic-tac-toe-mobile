import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const menuItems = [
    { label: "Play Local", onPress: () => navigation.navigate("Game", { mode: "local" }) },
    { label: "Play vs Computer", onPress: () => navigation.navigate("Game", { mode: "computer" }) },
    { label: "Play Online", onPress: () => navigation.navigate("Lobby") },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>
          Welcome, <Text style={styles.highlight}>{user ? user.username : "Guest"}</Text>
        </Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
            <Text style={styles.profileText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>ArenaX</Text>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    greeting: { color: c.textSecondary, fontSize: 15 },
    highlight: { color: c.accent, fontWeight: "700" },
    topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    profileBtn: {
      backgroundColor: c.subtle,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    profileText: { color: c.accent, fontWeight: "600" },
    logoutBtn: {
      backgroundColor: c.subtle,
      borderColor: c.danger,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    logoutText: { color: c.dangerText, fontWeight: "600" },
    content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
    title: {
      fontSize: 52,
      fontWeight: "900",
      color: c.text,
      marginBottom: 50,
      letterSpacing: 2,
    },
    menu: { width: "100%", maxWidth: 360, gap: 16 },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 22,
    },
    arrow: { color: c.accent, fontSize: 26, fontWeight: "800", marginRight: 16 },
    menuText: { color: c.text, fontSize: 20, fontWeight: "600" },
  });

export default HomeScreen;

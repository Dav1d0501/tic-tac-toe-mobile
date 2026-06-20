import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const menuItems = [
    { label: t("playLocal"), onPress: () => navigation.navigate("Game", { mode: "local" }) },
    { label: t("playComputer"), onPress: () => navigation.navigate("Game", { mode: "computer" }) },
    { label: t("playOnline"), onPress: () => navigation.navigate("Lobby") },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>
          {t("welcome")} <Text style={styles.highlight}>{user ? user.username : "Guest"}</Text>
        </Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.profileText}>{t("profile")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
            <Text style={styles.logoutText}>{t("logout")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ArenaX</Text>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name="arrow-forward" size={24} color={colors.accent} style={styles.arrow} />
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.subtle,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    profileText: { color: c.accent, fontWeight: "600" },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.subtle,
      borderColor: c.danger,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    logoutText: { color: c.dangerText, fontWeight: "600" },
    content: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingVertical: 30 },
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
    arrow: { marginRight: 16 },
    menuText: { color: c.text, fontSize: 20, fontWeight: "600" },
  });

export default HomeScreen;

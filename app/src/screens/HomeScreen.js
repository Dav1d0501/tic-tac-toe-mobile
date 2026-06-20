import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

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
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0c29" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: { color: "#d9d2e8", fontSize: 15 },
  highlight: { color: "#4cc9f0", fontWeight: "700" },
  logoutBtn: {
    backgroundColor: "rgba(255,77,77,0.15)",
    borderColor: "#ff4d4d",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: { color: "#ff6b6b", fontWeight: "600" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  title: {
    fontSize: 52,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 50,
    letterSpacing: 2,
  },
  menu: { width: "100%", maxWidth: 360, gap: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  arrow: { color: "#4cc9f0", fontSize: 26, fontWeight: "800", marginRight: 16 },
  menuText: { color: "#fff", fontSize: 20, fontWeight: "600" },
});

export default HomeScreen;

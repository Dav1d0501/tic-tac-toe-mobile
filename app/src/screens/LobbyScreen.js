import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";

import socket from "../socket";
import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const LobbyScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [roomName, setRoomName] = useState("");
  const [size, setSize] = useState(3);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Rooms matching the search text
  const filteredRooms = availableRooms.filter((room) =>
    room.id.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Holds the room we are joining until the server confirms
  const pendingRoomRef = useRef("");

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/users/leaderboard`);
      setLeaderboard(await res.json());
    } catch (err) {
      console.error("Error fetching leaderboard", err);
    }
  };

  const fetchFriends = async (userId) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/users/friends/${userId}`);
      setFriends(await res.json());
    } catch (err) {
      console.error("Error fetching friends", err);
    }
  };

  // Loads leaderboard and friends, then refreshes every ten seconds
  useEffect(() => {
    if (user) fetchFriends(user._id);
    fetchLeaderboard();

    const interval = setInterval(() => {
      fetchLeaderboard();
      if (user) fetchFriends(user._id);
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Listens for room updates and join confirmation
  useEffect(() => {
    socket.emit("get_rooms");

    const handleUpdateRooms = (rooms) => setAvailableRooms(rooms);
    const handleRoomJoined = (data) => {
      navigation.navigate("Game", {
        mode: "multiplayer",
        room: pendingRoomRef.current,
        role: data.role,
        size: data.size,
        isHost: data.isHost,
      });
    };
    const handleError = (msg) => Alert.alert("Notice", msg);

    socket.on("update_rooms", handleUpdateRooms);
    socket.on("room_joined", handleRoomJoined);
    socket.on("error_message", handleError);

    return () => {
      socket.off("update_rooms", handleUpdateRooms);
      socket.off("room_joined", handleRoomJoined);
      socket.off("error_message", handleError);
    };
  }, [navigation]);

  const handleCreate = () => {
    if (!roomName || roomName.trim() === "") {
      return Alert.alert("Missing name", "Please enter a room name!");
    }
    if (!user) return Alert.alert("Login required", "Please log in to create a room!");

    pendingRoomRef.current = roomName.trim();
    socket.emit("create_room", { roomId: roomName.trim(), size, user });
  };

  const handleJoin = (roomId) => {
    setRoomName(roomId);
    pendingRoomRef.current = roomId;
    socket.emit("join_room", { roomId, user });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color={colors.text} />
            <Text style={styles.backText}>{t("menu")}</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Ionicons name="globe-outline" size={20} color={colors.text} />
            <Text style={styles.headerTitle}>{t("arena")}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.smallBtn}>
            <Ionicons name="person-circle-outline" size={16} color={colors.text} />
            <Text style={styles.smallBtnText}>{t("profile")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.smallBtn}>
            <Ionicons name="log-out-outline" size={16} color={colors.text} />
            <Text style={styles.smallBtnText}>{t("logout")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {leaderboard.length > 0 && (
        <View style={styles.champion}>
          <Ionicons name="trophy" size={16} color={colors.gold} />
          <Text style={styles.championText}>
            {t("champion")} <Text style={styles.championName}>{leaderboard[0].username}</Text> (
            {leaderboard[0].wins} {t("wins")})
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="game-controller" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>{t("createRoom")}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t("roomName")}
            placeholderTextColor={colors.placeholder}
            value={roomName}
            onChangeText={setRoomName}
          />
          <Text style={styles.sliderLabel}>
            {t("boardSize")} <Text style={styles.sliderValue}>{size}x{size}</Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={3}
            maximumValue={10}
            step={1}
            value={size}
            onValueChange={setSize}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.inputBorder}
            thumbTintColor={colors.accent}
          />
          <TouchableOpacity style={styles.actionBtn} onPress={handleCreate}>
            <Text style={styles.actionBtnText}>{t("createPlay")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="rocket" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>{t("availableRooms")}</Text>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.placeholder} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("searchRooms")}
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.placeholder} />
              </TouchableOpacity>
            )}
          </View>

          {availableRooms.length === 0 ? (
            <Text style={styles.empty}>{t("noRooms")}</Text>
          ) : filteredRooms.length === 0 ? (
            <Text style={styles.empty}>{t("noMatch")}</Text>
          ) : (
            filteredRooms.map((room) => (
              <View key={room.id} style={styles.roomItem}>
                <View>
                  <Text style={styles.roomName}>{room.id}</Text>
                  <Text style={styles.roomMeta}>
                    {room.size}x{room.size} • {room.playersCount}/2
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={room.playersCount >= 2}
                  onPress={() => handleJoin(room.id)}
                  style={[styles.joinBtn, room.playersCount >= 2 && styles.joinBtnDisabled]}
                >
                  <Text style={styles.joinBtnText}>
                    {room.playersCount >= 2 ? t("full") : t("join")}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>{t("friends")}</Text>
          </View>
          {friends.length === 0 ? (
            <Text style={styles.empty}>{t("noFriends")}</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend._id} style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  <Ionicons
                    name="ellipse"
                    size={10}
                    color={friend.isOnline ? colors.success : colors.textMuted}
                  />
                  <Text style={styles.friendName}>{friend.username}</Text>
                </View>
                <View style={styles.friendWinsRow}>
                  <Ionicons name="trophy" size={14} color={colors.gold} />
                  <Text style={styles.friendWins}>{friend.wins}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.subtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    backText: { color: c.text, fontWeight: "600" },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: "700" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    smallBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.subtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    smallBtnText: { color: c.text, fontWeight: "600" },
    champion: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.card,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      borderRadius: 10,
    },
    championText: { color: c.gold, textAlign: "center", fontWeight: "600" },
    championName: { color: c.text, fontWeight: "800" },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
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
    sliderLabel: { color: c.textSecondary, fontWeight: "600", marginBottom: 2 },
    sliderValue: { color: c.accent, fontWeight: "800" },
    slider: { width: "100%", height: 40, marginBottom: 8 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: c.text },
    actionBtn: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
    actionBtnText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
    empty: { color: c.placeholder, fontStyle: "italic" },
    roomItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    roomName: { color: c.text, fontSize: 16, fontWeight: "600" },
    roomMeta: { color: c.textMuted, fontSize: 13 },
    joinBtn: { backgroundColor: c.success, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    joinBtnDisabled: { backgroundColor: c.textMuted },
    joinBtnText: { color: "#fff", fontWeight: "800" },
    friendItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    friendInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
    friendName: { color: c.text, fontSize: 15 },
    friendWinsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    friendWins: { color: c.gold, fontWeight: "600" },
  });

export default LobbyScreen;

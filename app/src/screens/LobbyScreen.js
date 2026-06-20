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

import socket from "../socket";
import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const SIZES = [3, 5, 10];

const LobbyScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [roomName, setRoomName] = useState("");
  const [size, setSize] = useState(3);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);

  // Remembers the room we are entering until the server confirms the join
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

  // Loads leaderboard and friends now and refreshes them every ten seconds
  useEffect(() => {
    if (user) fetchFriends(user._id);
    fetchLeaderboard();

    const interval = setInterval(() => {
      fetchLeaderboard();
      if (user) fetchFriends(user._id);
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Listens for the room list and for confirmation that we joined a room
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
      return Alert.alert("Missing name", "Please enter a room name! 📝");
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
            <Text style={styles.backText}>⬅ Menu</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arena 🌍</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Logout 🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {leaderboard.length > 0 && (
        <View style={styles.champion}>
          <Text style={styles.championText}>
            👑 Champion: <Text style={styles.championName}>{leaderboard[0].username}</Text> (
            {leaderboard[0].wins} Wins)
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎮 Create Room</Text>
          <TextInput
            style={styles.input}
            placeholder="Room Name..."
            placeholderTextColor={colors.placeholder}
            value={roomName}
            onChangeText={setRoomName}
          />
          <View style={styles.sizeRow}>
            {SIZES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSize(s)}
                style={[styles.sizeBtn, size === s && styles.sizeBtnActive]}
              >
                <Text style={[styles.sizeBtnText, size === s && styles.sizeBtnTextActive]}>
                  {s}x{s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCreate}>
            <Text style={styles.actionBtnText}>Create & Play</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Available Rooms</Text>
          {availableRooms.length === 0 ? (
            <Text style={styles.empty}>No active rooms. Be the first!</Text>
          ) : (
            availableRooms.map((room) => (
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
                    {room.playersCount >= 2 ? "FULL" : "JOIN"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Friends</Text>
          {friends.length === 0 ? (
            <Text style={styles.empty}>You have no friends yet. Play a game to add some!</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend._id} style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  <Text style={{ color: friend.isOnline ? colors.success : colors.textMuted }}>●</Text>
                  <Text style={styles.friendName}>{friend.username}</Text>
                </View>
                <Text style={styles.friendWins}>🏆 {friend.wins}</Text>
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
    backBtn: {
      backgroundColor: c.subtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    backText: { color: c.text, fontWeight: "600" },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: "700" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    smallBtn: {
      backgroundColor: c.subtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    smallBtnText: { color: c.text, fontWeight: "600" },
    champion: {
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
    cardTitle: { color: c.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
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
    sizeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    sizeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: c.subtle,
      alignItems: "center",
    },
    sizeBtnActive: { backgroundColor: c.accent },
    sizeBtnText: { color: c.textSecondary, fontWeight: "600" },
    sizeBtnTextActive: { color: c.onAccent, fontWeight: "800" },
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
    friendWins: { color: c.gold, fontWeight: "600" },
  });

export default LobbyScreen;

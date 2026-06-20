import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import socket from "../socket";
import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";

const SIZES = [3, 5, 10];

const LobbyScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();

  const [roomName, setRoomName] = useState("");
  const [size, setSize] = useState(3);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");

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

  const openEmailModal = () => {
    setNewEmail(user?.email || "");
    setShowEmailModal(true);
  };

  // Sends the new email to the server and updates the saved user
  const handleUpdateEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return Alert.alert("Invalid email", "Please enter a valid email address! ❌");
    }
    if (!user) return;
    if (newEmail === user.email) {
      setShowEmailModal(false);
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/users/update-email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, newEmail }),
      });
      const data = await res.json();
      if (!res.ok) return Alert.alert("Error", data.message || "Failed to update email");

      await updateUser({ email: newEmail });
      Alert.alert("Success", "Email updated successfully! 📧");
      setShowEmailModal(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Connection error while updating email");
    }
  };

  // Deletes the account after the user types DELETE to confirm
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    if (!user) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/users/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });

      if (res.ok) {
        setShowDeleteModal(false);
        await logout();
      } else {
        Alert.alert("Error", "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Connection error");
    }
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
          <TouchableOpacity onPress={openEmailModal} style={styles.iconBtn}>
            <Text style={{ fontSize: 20 }}>✉️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Logout 🚪</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.deleteBtn}>
            <Text style={styles.smallBtnText}>🗑️</Text>
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
            placeholderTextColor="#887a7a"
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
                  <Text style={{ color: friend.isOnline ? "#20c997" : "#777" }}>●</Text>
                  <Text style={styles.friendName}>{friend.username}</Text>
                </View>
                <Text style={styles.friendWins}>🏆 {friend.wins}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Email ✉️</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email..."
              placeholderTextColor="#887a7a"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowEmailModal(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateEmail}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: "#ff4d4d" }]}>⚠️ Danger Zone</Text>
            <Text style={{ color: "#d9d2e8", textAlign: "center", marginBottom: 12 }}>
              Are you sure you want to delete your account?
            </Text>
            <TextInput
              style={[styles.input, { textAlign: "center" }]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type DELETE"
              placeholderTextColor="#887a7a"
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deleteConfirmation !== "DELETE"}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: deleteConfirmation === "DELETE" ? "#ff4d4d" : "#555",
                  },
                ]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.primaryBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0c29" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: { color: "#fff", fontWeight: "600" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 4 },
  smallBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtn: {
    backgroundColor: "rgba(255,77,77,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { color: "#fff", fontWeight: "600" },
  champion: {
    backgroundColor: "rgba(232,215,84,0.12)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  championText: { color: "#E8D754", textAlign: "center", fontWeight: "600" },
  championName: { color: "#fff", fontWeight: "800" },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
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
  sizeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  sizeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  sizeBtnActive: { backgroundColor: "#4cc9f0" },
  sizeBtnText: { color: "#d9d2e8", fontWeight: "600" },
  sizeBtnTextActive: { color: "#0f0c29", fontWeight: "800" },
  actionBtn: { backgroundColor: "#4cc9f0", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  actionBtnText: { color: "#0f0c29", fontWeight: "800", fontSize: 16 },
  empty: { color: "#887a7a", fontStyle: "italic" },
  roomItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  roomName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  roomMeta: { color: "#9b93ad", fontSize: 13 },
  joinBtn: { backgroundColor: "#20c997", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnDisabled: { backgroundColor: "#555" },
  joinBtnText: { color: "#fff", fontWeight: "800" },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  friendInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  friendName: { color: "#fff", fontSize: 15 },
  friendWins: { color: "#E8D754", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#1a1730",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 8 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700" },
  primaryBtn: { flex: 1, backgroundColor: "#4cc9f0", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryBtnText: { color: "#0f0c29", fontWeight: "800" },
});

export default LobbyScreen;

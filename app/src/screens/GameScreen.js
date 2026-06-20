import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import socket from "../socket";
import Board from "../components/Board";
import { useTheme } from "../context/ThemeContext";

const GameScreen = ({ route, navigation }) => {
  const { mode, room, size: onlineSize, isHost: initialIsHost, role } = route.params || {};
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isHost, setIsHost] = useState(initialIsHost || false);
  const [localSize, setLocalSize] = useState(3);
  const [difficulty, setDifficulty] = useState("hard");
  const [starter, setStarter] = useState("user");

  const currentSize = mode === "multiplayer" ? onlineSize : localSize;

  // Sends back to the lobby if we reached a multiplayer game with no room
  useEffect(() => {
    if (mode === "multiplayer" && !room) {
      Alert.alert("Lost connection", "Please join via Lobby.");
      navigation.navigate("Lobby");
    }
  }, [mode, room, navigation]);

  // Becomes the new host if the original host leaves
  useEffect(() => {
    if (mode !== "multiplayer") return;
    const handleYouAreHost = () => {
      setIsHost(true);
      Alert.alert("Host changed", "The host left. You are now the host!");
    };
    socket.on("you_are_host", handleYouAreHost);
    return () => socket.off("you_are_host", handleYouAreHost);
  }, [mode]);

  const handleBack = () => {
    if (mode === "multiplayer") {
      if (room) socket.emit("leave_room", room);
      navigation.navigate("Lobby");
    } else {
      navigation.navigate("Home");
    }
  };

  const getTitle = () => {
    if (mode === "computer") return "Man vs Machine";
    if (mode === "multiplayer") return `Room: ${room}`;
    return "Local Game (1 Phone)";
  };

  const SizeButton = ({ value }) => (
    <TouchableOpacity
      onPress={() => setLocalSize(value)}
      style={[styles.ctrlBtn, localSize === value && styles.ctrlBtnActive]}
    >
      <Text style={[styles.ctrlBtnText, localSize === value && styles.ctrlBtnTextActive]}>
        {value}x{value}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>
              ← Back to {mode === "multiplayer" ? "Lobby" : "Menu"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{getTitle()}</Text>

        {mode !== "multiplayer" && (
          <View style={styles.controlsGroup}>
            <Text style={styles.controlLabel}>Board Size:</Text>
            <View style={styles.controlRow}>
              <SizeButton value={3} />
              <SizeButton value={5} />
              <SizeButton value={10} />
            </View>
          </View>
        )}

        {mode === "computer" && (
          <>
            {currentSize === 3 && (
              <View style={styles.controlsGroup}>
                <Text style={styles.controlLabel}>Difficulty:</Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    onPress={() => setDifficulty("easy")}
                    style={[styles.ctrlBtn, difficulty === "easy" && styles.ctrlBtnActive]}
                  >
                    <Text style={[styles.ctrlBtnText, difficulty === "easy" && styles.ctrlBtnTextActive]}>
                      Easy
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDifficulty("hard")}
                    style={[styles.ctrlBtn, difficulty === "hard" && styles.ctrlBtnActive]}
                  >
                    <Text style={[styles.ctrlBtnText, difficulty === "hard" && styles.ctrlBtnTextActive]}>
                      Hard
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.controlsGroup}>
              <Text style={styles.controlLabel}>First Turn:</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity
                  onPress={() => setStarter("user")}
                  style={[styles.ctrlBtn, starter === "user" && styles.ctrlBtnActive]}
                >
                  <Text style={[styles.ctrlBtnText, starter === "user" && styles.ctrlBtnTextActive]}>
                    Me (X)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStarter("computer")}
                  style={[styles.ctrlBtn, starter === "computer" && styles.ctrlBtnActive]}
                >
                  <Text style={[styles.ctrlBtnText, starter === "computer" && styles.ctrlBtnTextActive]}>
                    PC (X)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <Board
          key={`${mode}-${currentSize}-${difficulty}-${starter}`}
          size={currentSize}
          gameMode={mode}
          difficulty={difficulty}
          starter={starter}
          room={room}
          isHost={isHost}
          myRole={role}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headerTop: { marginBottom: 10 },
    backBtn: { alignSelf: "flex-start" },
    backText: { color: c.accent, fontWeight: "600", fontSize: 15 },
    title: { color: c.text, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 16 },
    controlsGroup: { marginBottom: 14, alignItems: "center" },
    controlLabel: { color: c.textSecondary, marginBottom: 8, fontWeight: "600" },
    controlRow: { flexDirection: "row", gap: 10 },
    ctrlBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.subtle,
    },
    ctrlBtnActive: { backgroundColor: c.accent },
    ctrlBtnText: { color: c.textSecondary, fontWeight: "600" },
    ctrlBtnTextActive: { color: c.onAccent, fontWeight: "800" },
  });

export default GameScreen;

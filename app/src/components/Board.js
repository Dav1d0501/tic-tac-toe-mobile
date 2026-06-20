import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { checkWinner } from "../utils/gameLogic";
import { getBestMove } from "../utils/computerAI";
import socket from "../socket";
import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const Board = ({ size, gameMode, difficulty, starter, room, isHost, myRole }) => {
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();

  // Board fits the shorter screen side so it stays square after rotation
  const boardWidth = Math.min(width - 32, height - 220, 360);
  const styles = useMemo(() => createStyles(colors, boardWidth), [colors, boardWidth]);

  const [board, setBoard] = useState(Array(size * size).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);

  const [myOnlineSymbol, setMyOnlineSymbol] = useState(myRole || null);
  const [opponent, setOpponent] = useState(null);

  const [friendMessage, setFriendMessage] = useState("");
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);

  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const chatScrollRef = useRef(null);

  const computerSymbol = starter === "computer" ? "X" : "O";
  const cellSize = boardWidth / size;

  // Clears the board whenever the game settings change
  useEffect(() => {
    resetGameLocal();
    if (myRole) setMyOnlineSymbol(myRole);
  }, [size, gameMode, difficulty, starter, myRole]);

  const resetGameLocal = () => {
    setBoard(Array(size * size).fill(null));
    setIsXNext(true);
    setWinner(null);
    setFriendMessage("");
  };

  // Checks if the opponent is already a friend once we know who they are
  useEffect(() => {
    if (opponent && opponent._id && user && user._id) {
      fetch(`${SERVER_URL}/api/users/friends/${user._id}`)
        .then((res) => res.json())
        .then((friends) => {
          const isFriend = friends.some((f) => f._id === opponent._id);
          setIsAlreadyFriend(isFriend);
          updateUser({ friends: friends.map((f) => f._id) });
        })
        .catch((err) => console.error("Error fetching friends:", err));
    }
  }, [opponent]);

  // Listens for opponent info, chat messages, resets and the opponent leaving
  useEffect(() => {
    if (gameMode !== "multiplayer") return;

    const handleOpponentData = (data) => setOpponent(data);
    const handleResetGame = () => resetGameLocal();
    const handleReceiveMessage = (data) =>
      setMessages((prev) => [...prev, data]);
    const handleOpponentLeft = () => {
      setOpponent(null);
      setWinner("OPPONENT_LEFT");
    };

    socket.on("opponent_data", handleOpponentData);
    socket.on("reset_game", handleResetGame);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("opponent_left", handleOpponentLeft);

    if (room) socket.emit("req_opponent_data", room);

    return () => {
      socket.off("opponent_data", handleOpponentData);
      socket.off("reset_game", handleResetGame);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("opponent_left", handleOpponentLeft);
    };
  }, [gameMode, room]);

  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Applies a move that came from the other player
  useEffect(() => {
    if (gameMode !== "multiplayer") return;

    const handleReceiveMove = (data) => {
      const moveIndex = data.index !== undefined ? data.index : data;
      handleMove(moveIndex, false);
    };

    socket.on("receive_move", handleReceiveMove);
    return () => socket.off("receive_move", handleReceiveMove);
  }, [gameMode, board, isXNext, winner]);

  // Lets the computer play when it is its turn
  useEffect(() => {
    const isComputerTurn =
      (isXNext && computerSymbol === "X") || (!isXNext && computerSymbol === "O");

    if (!winner && gameMode === "computer" && isComputerTurn) {
      const timeoutId = setTimeout(() => {
        const bestMove = getBestMove(board, size, difficulty);
        if (bestMove !== null) handleMove(bestMove);
      }, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [isXNext, winner, gameMode, board, size, difficulty, computerSymbol]);

  // The host reports the result so the server can update the scores
  useEffect(() => {
    if (winner && gameMode === "multiplayer" && isHost) {
      socket.emit("game_over", { room, winnerSymbol: winner });
    }
  }, [winner, gameMode, room, isHost]);

  // Places a symbol, checks for a winner and sends the move when online
  const handleMove = (index, emitEvent = true) => {
    const newBoard = [...board];
    if (newBoard[index] || winner) return;

    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);

    const result = checkWinner(newBoard, size);
    if (result) setWinner(result);
    else setIsXNext(!isXNext);

    if (gameMode === "multiplayer" && emitEvent) {
      socket.emit("send_move", { index, room, player: isXNext ? "X" : "O" });
    }
  };

  // Handles a tap on a cell and blocks taps that are not allowed
  const handleCellClick = (index) => {
    if (board[index] || winner) return;
    const isComputerTurn =
      (isXNext && computerSymbol === "X") || (!isXNext && computerSymbol === "O");
    if (gameMode === "computer" && isComputerTurn) return;

    if (gameMode === "multiplayer") {
      const isMyTurn =
        (isXNext && myOnlineSymbol === "X") || (!isXNext && myOnlineSymbol === "O");
      if (!isMyTurn) return;
    }
    handleMove(index, true);
  };

  const handleResetClick = () => {
    if (gameMode === "multiplayer") {
      if (room) socket.emit("reset_game", room);
    } else {
      resetGameLocal();
    }
  };

  // Sends a friend request for the current opponent
  const handleAddFriend = async () => {
    if (!opponent || !opponent._id) return setFriendMessage("Cannot add Guest");
    if (!user || !user._id) return setFriendMessage("Please Login first");

    setFriendMessage("Adding...");
    try {
      const res = await fetch(`${SERVER_URL}/api/users/add-friend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, friendId: opponent._id }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendMessage("Friend Added!");
        setIsAlreadyFriend(true);
        const nextFriends = [...(user.friends || []), opponent._id];
        updateUser({ friends: nextFriends });
      } else {
        setFriendMessage(data.message || "Error");
      }
    } catch (err) {
      setFriendMessage("Connection Error");
    }
  };

  const handleSendMessage = () => {
    if (currentMessage.trim() !== "" && room) {
      const senderName = user ? user.username : "Guest";
      socket.emit("send_message", { room, message: currentMessage, sender: senderName });
      setCurrentMessage("");
    }
  };

  const getEndGameMessage = () => {
    if (winner === "Draw") return t("draw");
    if (winner === "OPPONENT_LEFT") return t("opponentFled");
    if (gameMode === "multiplayer" && myOnlineSymbol) {
      return winner === myOnlineSymbol ? t("youWon") : t("youLost");
    }
    return `${t("winner")}: ${winner}`;
  };

  const myUsername = user ? user.username : "Guest";

  return (
    <View style={styles.container}>
      <View style={styles.matchInfo}>
        {gameMode === "multiplayer" && opponent ? (
          <Text style={styles.matchText}>
            <Text style={{ color: colors.accent }}>{t("you")} ({myOnlineSymbol})</Text>
            {`  ${t("vs")}  `}
            <Text style={{ color: colors.danger }}>
              {opponent.username} ({myOnlineSymbol === "X" ? "O" : "X"})
            </Text>
          </Text>
        ) : (
          <Text style={styles.matchText}>{t("classic")}</Text>
        )}
      </View>

      <View style={styles.status}>
        {winner ? (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.winnerMsg}>{getEndGameMessage()}</Text>
            {gameMode === "multiplayer" && opponent && opponent._id && (
              <View style={{ marginTop: 8 }}>
                {isAlreadyFriend ? (
                  <View style={styles.friendsRow}>
                    <Ionicons name="people" size={16} color={colors.success} />
                    <Text style={styles.friendsLabel}>{t("areFriends")}</Text>
                  </View>
                ) : !friendMessage ? (
                  <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend}>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.addFriendText}>{t("add")} {opponent.username}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.friendMsg}>{friendMessage}</Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.turn}>
            {t("turn")} <Text style={styles.turnIndicator}>{isXNext ? "X" : "O"}</Text>
          </Text>
        )}
      </View>

      <View style={[styles.board, { width: boardWidth, height: boardWidth }]}>
        {board.map((cell, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            disabled={!!winner}
            onPress={() => handleCellClick(index)}
            style={[styles.cell, { width: cellSize, height: cellSize }]}
          >
            <Text
              style={[
                styles.cellText,
                { fontSize: Math.max(14, cellSize * 0.5) },
                cell === "X" && { color: colors.accent },
                cell === "O" && { color: colors.danger },
              ]}
            >
              {cell}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(gameMode !== "multiplayer" || isHost) && (
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetClick}>
          <Text style={styles.resetText}>{t("newGame")}</Text>
        </TouchableOpacity>
      )}

      {gameMode === "multiplayer" && (
        <View style={styles.chat}>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatMessages}
            nestedScrollEnabled
          >
            {messages.length === 0 ? (
              <Text style={styles.chatEmpty}>{t("startConversation")}</Text>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender === myUsername;
                return (
                  <View
                    key={idx}
                    style={[styles.msgRow, isMe ? styles.msgMine : styles.msgOpp]}
                  >
                    <Text style={styles.msgSender}>{isMe ? "You" : msg.sender}</Text>
                    <View style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleOpp]}>
                      <Text style={[styles.bubbleText, { color: isMe ? colors.onAccent : colors.text }]}>
                        {msg.message}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.chatInputArea}>
            <TextInput
              style={styles.chatInput}
              value={currentMessage}
              onChangeText={setCurrentMessage}
              placeholder={t("typeMessage")}
              placeholderTextColor={colors.placeholder}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Text style={styles.sendText}>{t("send")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (c, boardWidth) =>
  StyleSheet.create({
    container: { alignItems: "center", marginTop: 10 },
    matchInfo: { marginBottom: 12 },
    matchText: { color: c.text, fontSize: 16, fontWeight: "700" },
    status: { minHeight: 50, justifyContent: "center", marginBottom: 10 },
    turn: { color: c.textSecondary, fontSize: 18 },
    turnIndicator: { color: c.accent, fontWeight: "800", fontSize: 20 },
    winnerMsg: { color: c.text, fontSize: 22, fontWeight: "800" },
    friendsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    friendsLabel: { color: c.success, fontWeight: "700", fontSize: 15 },
    friendMsg: { color: c.accent, fontWeight: "700" },
    addFriendBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.success,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    addFriendText: { color: "#fff", fontWeight: "700" },
    board: {
      flexDirection: "row",
      flexWrap: "wrap",
      backgroundColor: c.boardBg,
      borderRadius: 8,
      overflow: "hidden",
    },
    cell: {
      borderWidth: 1,
      borderColor: c.boardLine,
      backgroundColor: c.cellBg,
      alignItems: "center",
      justifyContent: "center",
    },
    cellText: { fontWeight: "800" },
    resetBtn: {
      marginTop: 18,
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingHorizontal: 28,
      paddingVertical: 12,
    },
    resetText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
    chat: {
      width: boardWidth,
      marginTop: 22,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chatMessages: { maxHeight: 180, marginBottom: 8 },
    chatEmpty: { color: c.placeholder, fontStyle: "italic", textAlign: "center", padding: 10 },
    msgRow: { marginBottom: 8, maxWidth: "80%" },
    msgMine: { alignSelf: "flex-end", alignItems: "flex-end" },
    msgOpp: { alignSelf: "flex-start", alignItems: "flex-start" },
    msgSender: { color: c.textMuted, fontSize: 11, marginBottom: 2 },
    bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    bubbleMine: { backgroundColor: c.accent },
    bubbleOpp: { backgroundColor: c.subtle },
    bubbleText: {},
    chatInputArea: { flexDirection: "row", gap: 8, alignItems: "center" },
    chatInput: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
    },
    sendBtn: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    sendText: { color: c.onAccent, fontWeight: "800" },
  });

export default Board;

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";

import { checkWinner } from "../utils/gameLogic";
import { getBestMove } from "../utils/computerAI";
import socket from "../socket";
import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

const Board = ({ size, gameMode, difficulty, starter, room, isHost, myRole }) => {
  const { user, updateUser } = useAuth();

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
  const cellSize = BOARD_WIDTH / size;

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
      setWinner("Opponent Fled 🏃💨");
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
        setFriendMessage("Friend Added! 🎉");
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
    if (winner === "Draw") return "It's a Draw! 🤝";
    if (winner === "Opponent Fled 🏃💨") return winner;
    if (gameMode === "multiplayer" && myOnlineSymbol) {
      return winner === myOnlineSymbol ? "You Won! 🎉" : "You Lost 💀";
    }
    return `Winner: ${winner} 🏆`;
  };

  const myUsername = user ? user.username : "Guest";

  return (
    <View style={styles.container}>
      <View style={styles.matchInfo}>
        {gameMode === "multiplayer" && opponent ? (
          <Text style={styles.matchText}>
            <Text style={{ color: "#4cc9f0" }}>You ({myOnlineSymbol})</Text>
            {"  VS  "}
            <Text style={{ color: "#ff4d4d" }}>
              {opponent.username} ({myOnlineSymbol === "X" ? "O" : "X"})
            </Text>
          </Text>
        ) : (
          <Text style={styles.matchText}>Classic Tic Tac Toe</Text>
        )}
      </View>

      <View style={styles.status}>
        {winner ? (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.winnerMsg}>{getEndGameMessage()}</Text>
            {gameMode === "multiplayer" && opponent && opponent._id && (
              <View style={{ marginTop: 8 }}>
                {isAlreadyFriend ? (
                  <Text style={styles.friendsLabel}>🤝 You are friends</Text>
                ) : !friendMessage ? (
                  <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend}>
                    <Text style={styles.addFriendText}>➕ Add {opponent.username}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.friendMsg}>{friendMessage}</Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.turn}>
            Turn: <Text style={styles.turnIndicator}>{isXNext ? "X" : "O"}</Text>
          </Text>
        )}
      </View>

      <View style={[styles.board, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}>
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
                cell === "X" && { color: "#4cc9f0" },
                cell === "O" && { color: "#ff4d4d" },
              ]}
            >
              {cell}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(gameMode !== "multiplayer" || isHost) && (
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetClick}>
          <Text style={styles.resetText}>New Game</Text>
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
              <Text style={styles.chatEmpty}>Start the conversation!</Text>
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
                      <Text style={[styles.bubbleText, { color: isMe ? "#0f0c29" : "#fff" }]}>
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
              placeholder="Type a message..."
              placeholderTextColor="#887a7a"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: 10 },
  matchInfo: { marginBottom: 12 },
  matchText: { color: "#e0e0e0", fontSize: 16, fontWeight: "700" },
  status: { minHeight: 50, justifyContent: "center", marginBottom: 10 },
  turn: { color: "#d9d2e8", fontSize: 18 },
  turnIndicator: { color: "#4cc9f0", fontWeight: "800", fontSize: 20 },
  winnerMsg: { color: "#fff", fontSize: 22, fontWeight: "800" },
  friendsLabel: { color: "#20c997", fontWeight: "700", fontSize: 15 },
  friendMsg: { color: "#4cc9f0", fontWeight: "700" },
  addFriendBtn: { backgroundColor: "#20c997", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addFriendText: { color: "#fff", fontWeight: "700" },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    overflow: "hidden",
  },
  cell: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#161229",
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: { fontWeight: "800" },
  resetBtn: {
    marginTop: 18,
    backgroundColor: "#4cc9f0",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  resetText: { color: "#0f0c29", fontWeight: "800", fontSize: 16 },
  chat: {
    width: BOARD_WIDTH,
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chatMessages: { maxHeight: 180, marginBottom: 8 },
  chatEmpty: { color: "#887a7a", fontStyle: "italic", textAlign: "center", padding: 10 },
  msgRow: { marginBottom: 8, maxWidth: "80%" },
  msgMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  msgOpp: { alignSelf: "flex-start", alignItems: "flex-start" },
  msgSender: { color: "#9b93ad", fontSize: 11, marginBottom: 2 },
  bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: "#4cc9f0" },
  bubbleOpp: { backgroundColor: "rgba(255,255,255,0.12)" },
  bubbleText: {},
  chatInputArea: { flexDirection: "row", gap: 8, alignItems: "center" },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
  },
  sendBtn: { backgroundColor: "#4cc9f0", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: "#0f0c29", fontWeight: "800" },
});

export default Board;

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Larger limit for base64 profile photos
app.use('/api/users', userRoutes);

const server = http.createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any client to connect
    methods: ["GET", "POST"],
  },
});

// In-memory storage
let rooms = {};
let onlineUsers = {}; // socket.id to userId

// Sends the room list to all clients
const broadcastRoomList = () => {
    const roomList = Object.keys(rooms).map((key) => ({
        id: key,
        playersCount: rooms[key].players.length,
        size: rooms[key].size
    }));
    io.emit('update_rooms', roomList);
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  broadcastRoomList();

  // Mark user online on connect
  socket.on("user_connected", async (userId) => {
    if (userId) {
      console.log(`User ${userId} is now Online`);
      onlineUsers[socket.id] = userId;

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    }
  });

  // Send room list on request
  socket.on('get_rooms', () => {
      broadcastRoomList();
  });

  // Create a new room with the host as first player
  socket.on("create_room", ({ roomId, size, user }) => {
    if (rooms[roomId]) {
        socket.emit("error_message", "Room already exists!");
        return;
    }

    rooms[roomId] = {
        players: [],
        size: parseInt(size),
        hostId: socket.id,
    };

    const userData = user || { _id: null, username: 'Guest' };
    joinRoomLogic(socket, roomId, userData, true);
  });

  // Join an existing room
  socket.on("join_room", (data) => {
    // Accept either a roomId or an object with user data
    const roomId = typeof data === 'object' ? data.roomId : data;
    const userData = typeof data === 'object' ? data.user : { _id: null, username: 'Guest' };

    const room = rooms[roomId];

    if (!room) {
        socket.emit("error_message", "Room does not exist!");
        broadcastRoomList();
        return;
    }
    if (room.players.length >= 2) {
        socket.emit("error_message", "Room is full!");
        return;
    }

    joinRoomLogic(socket, roomId, userData, false);
  });
  // Send opponent data to the requesting player
  socket.on("req_opponent_data", (roomId) => {
      const room = rooms[roomId];
      if (room && room.players.length === 2) {
          const opponent = room.players.find(p => p.id !== socket.id);

          if (opponent) {
             socket.emit("opponent_data", {
                 _id: opponent.userId,
                 username: opponent.username
             });
          }
      }
  });

  // Adds a player to a room and starts the game when full
  const joinRoomLogic = (socket, roomId, userData, isCreator) => {
      const room = rooms[roomId];

      // Assign X or O based on what is taken
      const takenRoles = room.players.map(p => p.symbol);
      const role = takenRoles.includes("X") ? "O" : "X";

      room.players.push({
          id: socket.id,
          symbol: role,
          userId: userData._id,
          username: userData.username
      });

      socket.join(roomId);

      socket.emit("room_joined", { role: role, size: room.size, isHost: isCreator || room.hostId === socket.id });

      // Start game and exchange details when room is full
      if (room.players.length === 2) {
          io.to(roomId).emit("game_start", { msg: "Game Started!" });

          const p1 = room.players[0];
          const p2 = room.players[1];

          // Send each player their opponent data
          io.to(p1.id).emit("opponent_data", { _id: p2.userId, username: p2.username });
          io.to(p2.id).emit("opponent_data", { _id: p1.userId, username: p1.username });
      }

      broadcastRoomList();
  };

  // Relay a move to the other player
  socket.on("send_move", (data) => {
    if (data.room) socket.to(data.room).emit("receive_move", data);
  });

  // Relay a chat message to the room
  socket.on("send_message", (data) => {
      const { room, message, sender } = data;
      if (room) {
          io.to(room).emit("receive_message", {
              message: message,
              sender: sender
          });
      }
  });
  // Update win and loss stats when a game ends
  socket.on("game_over", async (data) => {
      const { room, winnerSymbol } = data;
      const currentRoom = rooms[room];

      if (currentRoom && currentRoom.players.length === 2) {
          const winner = currentRoom.players.find(p => p.symbol === winnerSymbol);
          const loser = currentRoom.players.find(p => p.symbol !== winnerSymbol);

          if (winner && loser && winner.userId && loser.userId) {
              try {
                  await User.findByIdAndUpdate(winner.userId, { $inc: { wins: 1 } });
                  await User.findByIdAndUpdate(loser.userId, { $inc: { losses: 1 } });
                  console.log(`Stats updated: ${winner.username} won, ${loser.username} lost`);
              } catch (err) {
                  console.error("Error updating game stats:", err);
              }
          }
      }
  });

  // Reset the game, host only
  socket.on("reset_game", (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
       io.to(roomId).emit("reset_game");
    }
  });

  // Removes a player and cleans up or reassigns the host
  const handlePlayerLeave = (roomId) => {
      const room = rooms[roomId];
      if (!room) return;

      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
      }

      socket.leave(roomId);

      if (room.players.length === 0) {
          // Delete empty room
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
      } else {
          socket.to(roomId).emit("opponent_left");

          // Pass host to remaining player if host left
          if (room.hostId === socket.id) {
              room.hostId = room.players[0].id;
              io.to(room.hostId).emit("you_are_host");
          }
      }
      broadcastRoomList();
  };

  socket.on("leave_room", (roomId) => {
      handlePlayerLeave(roomId);
  });

  // Mark user offline and remove them from any room
  socket.on('disconnect', async () => {
    const userId = onlineUsers[socket.id];
    if (userId) {
        try {
            await User.findByIdAndUpdate(userId, { isOnline: false });
        } catch (err) {
            console.error("Error updating offline status:", err);
        }
        delete onlineUsers[socket.id];
    }

    for (const roomId in rooms) {
        if (rooms[roomId].players.find(p => p.id === socket.id)) {
            handlePlayerLeave(roomId);
            break;
        }
    }
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});

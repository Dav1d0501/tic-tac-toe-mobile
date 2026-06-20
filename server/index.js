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
app.use(express.json());
app.use('/api/users', userRoutes);

const server = http.createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connection from any client (web or mobile)
    methods: ["GET", "POST"],
  },
});

// --- In-memory storage ---
let rooms = {};
let onlineUsers = {}; // Maps socket.id -> userId

// Helper: Send room list to all clients
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

  // Send initial room list
  broadcastRoomList();

  // --- 1. User Online Status Management ---

  socket.on("user_connected", async (userId) => {
    if (userId) {
      console.log(`User ${userId} is now Online`);
      onlineUsers[socket.id] = userId;

      // Update DB: User is Online
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    }
  });

  // --- 2. Room Management ---

  socket.on('get_rooms', () => {
      broadcastRoomList();
  });

  socket.on("create_room", ({ roomId, size, user }) => { // Updated to receive user data
    if (rooms[roomId]) {
        socket.emit("error_message", "Room already exists!");
        return;
    }

    // Initialize new room
    rooms[roomId] = {
        players: [],
        size: parseInt(size),
        hostId: socket.id,
    };

    // Add host as first player
    const userData = user || { _id: null, username: 'Guest' };
    joinRoomLogic(socket, roomId, userData, true);
  });

  socket.on("join_room", (data) => {
    // Support legacy calls (just roomId) or new calls (object with user data)
    const roomId = typeof data === 'object' ? data.roomId : data;
    const userData = typeof data === 'object' ? data.user : { _id: null, username: 'Guest' };

    const room = rooms[roomId];

    // Validation
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
  socket.on("req_opponent_data", (roomId) => {
      const room = rooms[roomId];
      if (room && room.players.length === 2) {
          // מציאת היריב
          const opponent = room.players.find(p => p.id !== socket.id);

          if (opponent) {
             // שליחת המידע רק למי שביקש
             socket.emit("opponent_data", {
                 _id: opponent.userId,
                 username: opponent.username
             });
          }
      }
  });

  // Helper function to handle joining logic
  const joinRoomLogic = (socket, roomId, userData, isCreator) => {
      const room = rooms[roomId];

      // Determine Role
      const takenRoles = room.players.map(p => p.symbol);
      const role = takenRoles.includes("X") ? "O" : "X";

      // Add player to room object
      room.players.push({
          id: socket.id,
          symbol: role,
          userId: userData._id,
          username: userData.username
      });

      socket.join(roomId);

      // Notify player
      socket.emit("room_joined", { role: role, size: room.size, isHost: isCreator || room.hostId === socket.id });

      // If room is full, start game and exchange details
      if (room.players.length === 2) {
          io.to(roomId).emit("game_start", { msg: "Game Started!" });

          const p1 = room.players[0];
          const p2 = room.players[1];

          // Send opponent data to each player (for "Add Friend" feature)
          io.to(p1.id).emit("opponent_data", { _id: p2.userId, username: p2.username });
          io.to(p2.id).emit("opponent_data", { _id: p1.userId, username: p1.username });
      }

      broadcastRoomList();
  };

  // --- 3. Game Logic & chat ---

  socket.on("send_move", (data) => {
    if (data.room) socket.to(data.room).emit("receive_move", data);
  });
  socket.on("send_message", (data) => {
      const { room, message, sender } = data;
      if (room) {
          io.to(room).emit("receive_message", {
              message: message,
              sender: sender
          });
      }
  });
  socket.on("game_over", async (data) => {
      const { room, winnerSymbol } = data;
      const currentRoom = rooms[room];

      if (currentRoom && currentRoom.players.length === 2) {
          const winner = currentRoom.players.find(p => p.symbol === winnerSymbol);
          const loser = currentRoom.players.find(p => p.symbol !== winnerSymbol);

          if (winner && loser && winner.userId && loser.userId) {
              try {
                  // Update Stats in DB
                  await User.findByIdAndUpdate(winner.userId, { $inc: { wins: 1 } });
                  await User.findByIdAndUpdate(loser.userId, { $inc: { losses: 1 } });
                  console.log(`Stats updated: ${winner.username} won, ${loser.username} lost`);
              } catch (err) {
                  console.error("Error updating game stats:", err);
              }
          }
      }
  });

  socket.on("reset_game", (roomId) => {
    const room = rooms[roomId];
    // Only host can reset
    if (room && room.hostId === socket.id) {
       io.to(roomId).emit("reset_game");
    }
  });

  // --- 4. Disconnect Handling ---

  const handlePlayerLeave = (roomId) => {
      const room = rooms[roomId];
      if (!room) return;

      // Find player index
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1); // Remove player
      }

      socket.leave(roomId);

      if (room.players.length === 0) {
          // Delete empty room
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
      } else {
          // Notify remaining player
          socket.to(roomId).emit("opponent_left");

          // Migrate host if needed
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

  socket.on('disconnect', async () => {
    // 1. Handle Online Status
    const userId = onlineUsers[socket.id];
    if (userId) {
        try {
            await User.findByIdAndUpdate(userId, { isOnline: false });
        } catch (err) {
            console.error("Error updating offline status:", err);
        }
        delete onlineUsers[socket.id];
    }

    // 2. Handle Room Leavings
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

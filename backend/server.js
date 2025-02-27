// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Force Socket.IO to only use polling (no WebSocket)
  // This will prevent conflicts with our raw WebSocket server
  transports: ["polling"],
});

// Simple health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`Socket.IO user connected: ${socket.id}`);

  // Log function for server messages
  function log(...args) {
    const array = ["Server:"];
    array.push(...args);
    socket.emit("log", array);
  }

  // Handle create or join room
  socket.on("create or join", (room, userName) => {
    log(`User ${userName || socket.id} wants to create or join room: ${room}`);

    // Get number of clients in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    let numClients = clientsInRoom ? clientsInRoom.size : 0;

    if (numClients === 0) {
      // Create room
      socket.join(room);
      socket.roomAdmin = true; // Mark as admin
      socket.emit("created", room, socket.id, userName);
      log(`User ${socket.id} created room ${room}`);
    } else {
      // Join room
      log(`User ${socket.id} joined room ${room}`);
      io.sockets.in(room).emit("join", room); // Notify users in room
      socket.join(room);
      socket.emit("joined", room, socket.id, userName); // Notify client that they joined a room
      io.sockets.in(room).emit("ready", socket.id); // Room is ready for creating connections
    }
  });

  // Handle message passing (for WebRTC signaling)
  socket.on("message", (message, toId = null, room = null) => {
    if (message && message.type) {
      log(`Client ${socket.id} sent message: ${message.type}`);
    } else {
      log(`Client ${socket.id} sent message`);
    }

    if (toId) {
      // Direct message to specific user
      io.to(toId).emit("message", message, socket.id);
    } else if (room) {
      // Broadcast to room except sender
      socket.broadcast.to(room).emit("message", message, socket.id);
    } else {
      // Broadcast to everyone except sender
      socket.broadcast.emit("message", message, socket.id);
    }
  });

  // Handle kick user
  socket.on("kickout", (socketId, room) => {
    // Check if requester is room admin
    if (socket.roomAdmin) {
      io.to(socketId).emit("kickout", socketId);

      // Force the user to leave the room
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.leave(room);
        log(`User ${socketId} was kicked from room ${room}`);
      }
    } else {
      log("Kickout failed: Not an admin");
      socket.emit("log", ["You're not authorized to kick users"]);
    }
  });

  // Handle leave room
  socket.on("leave room", (room) => {
    socket.leave(room);
    socket.emit("left room", room);
    socket.broadcast.to(room).emit("message", { type: "leave" }, socket.id);
    log(`User ${socket.id} left room ${room}`);

    // Reset admin status when leaving
    if (socket.roomAdmin) {
      socket.roomAdmin = false;
    }
  });

  // Handle disconnection
  socket.on("disconnecting", () => {
    console.log(`User disconnecting: ${socket.id}`);

    // Notify all rooms this socket is in
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.broadcast.to(room).emit("message", { type: "leave" }, socket.id);
        log(`User ${socket.id} left room ${room} (disconnected)`);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket.IO user disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

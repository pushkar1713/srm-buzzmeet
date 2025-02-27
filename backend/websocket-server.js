// websocket-server.js
const WebSocket = require("ws");
const http = require("http");

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket Server for y-webrtc");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log("WebSocket server for y-webrtc signaling starting...");

// Handle connections
wss.on("connection", (ws) => {
  console.log("Client connected to signaling server");

  // Handle messages from clients
  ws.on("message", (message) => {
    console.log("Received message, broadcasting to other clients");

    // Broadcast to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error("Error sending message:", err);
        }
      }
    });
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("Client disconnected from signaling server");
  });
});

// Start server
const PORT = process.env.WS_PORT || 8081;
server.listen(PORT, () => {
  console.log(`WebSocket signaling server running on port ${PORT}`);
});

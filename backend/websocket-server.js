const WebSocket = require("ws");
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("y-webrtc signaling server");
});

const wss = new WebSocket.Server({ server });

// Proper heartbeat implementation
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("connection", (ws) => {
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
    console.log("Received pong from client");
  });

  ws.on("message", (message) => {
    // Broadcast to ALL clients including sender
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  console.log("New client connected");
});

server.listen(8081, () => {
  console.log("Signaling server running on ws://localhost:8081");
});

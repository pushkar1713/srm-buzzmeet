import React, { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

const Whiteboard = ({ roomId, inRoom, userId }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [elements, setElements] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [peerCount, setPeerCount] = useState(0);
  const [debugMessages, setDebugMessages] = useState([]);

  // Use refs to prevent recreation on re-renders
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const yElementsRef = useRef(null);

  // Debug logging with UI display
  const log = useCallback(
    (message, ...args) => {
      console.log(`[Whiteboard ${roomId}] ${message}`, ...args);
      const timestamp = new Date().toLocaleTimeString();
      setDebugMessages((prev) => {
        const newMessages = [`${timestamp}: ${message}`].concat(prev);
        return newMessages.slice(0, 10); // Keep only the last 10 messages
      });
    },
    [roomId]
  );

  // Initialize Yjs collaboration
  useEffect(() => {
    if (!inRoom || !roomId) return;

    log(`Initializing whiteboard for room: ${roomId}`);

    // Clean up any existing connections
    if (providerRef.current) {
      log("Cleaning up existing provider");
      try {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      } catch (e) {
        console.error("Error cleaning up provider:", e);
      }
    }

    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch (e) {
        console.error("Error cleaning up Y.doc:", e);
      }
    }

    // Create a new Y.Doc
    const doc = new Y.Doc();
    ydocRef.current = doc;
    log("Y.Doc created");

    // Create a unique room name based on roomId
    // Make sure to prefix it to avoid conflicts with other docs
    const roomName = `whiteboard-${roomId}`;

    // For debugging, use a simpler connection to start
    log(`Attempting to connect to signaling server for room: ${roomName}`);

    try {
      // Create the provider with awareness
      const provider = new WebrtcProvider(`whiteboard-${roomId}`, doc, {
        signaling: ["ws://localhost:8081"],
        maxConns: 10, // Reduced for debugging
        filterBcConns: true,
        peerOpts: {
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:global.stun.twilio.com:3478" },
              // If you have TURN servers, add them here
            ],
          },
        },
        awareness: doc.awareness,
      });

      providerRef.current = provider;
      log(`WebRTC provider created for room ${roomName}`);

      // Set up the shared array for Excalidraw elements
      yElementsRef.current = doc.getArray("excalidraw-elements");
      log("Y.doc array for elements created");

      // Set user data for awareness
      const clientId =
        userId || `anonymous-${Math.floor(Math.random() * 10000)}`;
      provider.awareness.setLocalStateField("user", {
        id: clientId,
        name: userId || "Anonymous",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });
      log(`Set client ID to: ${clientId}`);

      // Handle connection status changes
      provider.on("status", (event) => {
        log(`Connection status changed to: ${event.status}`);
        setConnectionStatus(event.status);
      });

      // Track connected peers
      provider.on("peers", (event) => {
        const peerCount = event.webrtcPeers.length;
        log(`Peers changed: ${peerCount} connected peers`);
        setPeerCount(peerCount);
      });

      provider.on("synced", () => {
        log("Content synced with peers!");

        // Load initial elements after sync
        if (excalidrawAPI && yElementsRef.current) {
          try {
            const initialElements = yElementsRef.current.toArray();
            log(`Loading ${initialElements.length} elements after sync`);
            excalidrawAPI.updateScene({ elements: initialElements });
            setElements(initialElements);
          } catch (err) {
            console.error("Error loading initial elements after sync:", err);
          }
        }
      });

      // Debug connection
      provider.on("connection-error", (event) => {
        log(`Connection error: ${event.error}`);
      });

      // Debug signaling connection
      provider.on("signal", (event) => {
        log(`Signal event: ${event.type}`);
      });
    } catch (e) {
      console.error("Error creating WebRTC provider:", e);
      log(`Error creating WebRTC provider: ${e.message}`);
    }

    return () => {
      log("Cleaning up Y.js resources");

      if (providerRef.current) {
        try {
          providerRef.current.disconnect();
          providerRef.current.destroy();
        } catch (e) {
          console.error("Error during provider cleanup:", e);
        }
        providerRef.current = null;
      }

      if (ydocRef.current) {
        try {
          ydocRef.current.destroy();
        } catch (e) {
          console.error("Error during Y.doc cleanup:", e);
        }
        ydocRef.current = null;
      }

      yElementsRef.current = null;
    };
  }, [roomId, inRoom, userId, log, excalidrawAPI]);

  // Sync Excalidraw with Yjs when elements change
  useEffect(() => {
    if (!excalidrawAPI || !ydocRef.current || !yElementsRef.current) return;

    log("Setting up observer for Yjs -> Excalidraw sync");

    // Update Excalidraw when Yjs changes
    const observer = (event) => {
      try {
        if (!yElementsRef.current) return;

        const remoteElements = yElementsRef.current.toArray();
        log(`Remote update received with ${remoteElements.length} elements`);

        // Update the Excalidraw scene
        excalidrawAPI.updateScene({ elements: remoteElements });
        setElements(remoteElements);
      } catch (err) {
        console.error("Error handling remote update:", err);
        log(`Error handling remote update: ${err.message}`);
      }
    };

    // Start observing changes
    yElementsRef.current.observe(observer);

    return () => {
      log("Removing Yjs observer");
      if (yElementsRef.current) {
        yElementsRef.current.unobserve(observer);
      }
    };
  }, [excalidrawAPI, log]);

  // Handle local changes in Excalidraw
  const onChange = useCallback(
    (newElements) => {
      if (
        !ydocRef.current ||
        !yElementsRef.current ||
        !newElements ||
        !excalidrawAPI
      )
        return;

      try {
        // Use a simple equality check on length first for efficiency
        const hasChanged = newElements.length !== elements.length;

        if (hasChanged) {
          log(
            `Local change detected, updating with ${newElements.length} elements`
          );

          // Update Yjs document (which will sync to other clients)
          ydocRef.current.transact(() => {
            yElementsRef.current.delete(0, yElementsRef.current.length);
            yElementsRef.current.push(newElements);
          });

          // Update local state
          setElements(newElements);
        }
      } catch (err) {
        console.error("Error handling local change:", err);
        log(`Error handling local change: ${err.message}`);
      }
    },
    [elements, excalidrawAPI, log]
  );

  // Force connections to restart - useful for debugging
  const restartConnections = useCallback(() => {
    if (!providerRef.current) return;

    log("Manually restarting connections");

    try {
      // Disconnect and reconnect the provider
      providerRef.current.disconnect();
      setTimeout(() => {
        providerRef.current.connect();
        log("Reconnection attempt made");
      }, 1000);
    } catch (e) {
      console.error("Error restarting connections:", e);
      log(`Error restarting connections: ${e.message}`);
    }
  }, [log]);

  if (!inRoom) {
    return (
      <div className="whiteboard-section">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "600px",
            border: "1px solid #ccc",
          }}
        >
          <p>Join a room to use the collaborative whiteboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="whiteboard-section">
      <div
        className="whiteboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h2>
          Collaborative Whiteboard{" "}
          <span
            style={{
              marginLeft: "10px",
              fontSize: "0.8em",
              color: connectionStatus === "connected" ? "green" : "red",
            }}
          >
            {connectionStatus} ({peerCount} peers)
          </span>
        </h2>
        <div className="whiteboard-controls">
          <button onClick={restartConnections} style={{ marginRight: "10px" }}>
            Restart Connection
          </button>
        </div>
      </div>

      {/* Debug info panel */}
      <div
        style={{
          marginBottom: "10px",
          padding: "5px",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          fontSize: "0.8em",
          maxHeight: "100px",
          overflowY: "auto",
        }}
      >
        <h4 style={{ margin: "0 0 5px 0" }}>Debug Info:</h4>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          {debugMessages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>

      <div style={{ height: "600px", width: "100%", border: "1px solid #ccc" }}>
        <Excalidraw
          ref={(api) => setExcalidrawAPI(api)}
          onChange={onChange}
          zenModeEnabled={false}
          gridModeEnabled={true}
          viewModeEnabled={false}
          theme="light"
        />
      </div>
    </div>
  );
};

export default Whiteboard;

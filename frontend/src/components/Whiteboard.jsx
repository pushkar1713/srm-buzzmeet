import React, { useEffect, useState, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

const Whiteboard = ({ roomId, inRoom }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [ydoc, setYdoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [elements, setElements] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Initialize Yjs collaboration
  useEffect(() => {
    if (!inRoom || !roomId) return;

    console.log(`Initializing Y.js with room ID: ${roomId}`);

    // Create a new Y.Doc
    const doc = new Y.Doc();

    // Create a unique room name based on roomId
    const roomName = `whiteboard-${roomId}`;

    // Connect to our dedicated signaling server
    const signalingServerUrl = "ws://localhost:8081";
    console.log(`Connecting to signaling server: ${signalingServerUrl}`);

    // Try using the default signaling servers first (more reliable for testing)
    const yProvider = new WebrtcProvider(roomName, doc, {
      signaling: [
        // First try our local server
        signalingServerUrl,
        // Fall back to default y-webrtc signaling servers if ours doesn't work
        "wss://signaling.yjs.dev",
        "wss://y-webrtc-signaling-eu.herokuapp.com",
        "wss://y-webrtc-signaling-us.herokuapp.com",
      ],
      maxConns: 20,
      filterBcConns: false,
      peerOpts: {},
    });

    // Handle connection status changes
    yProvider.on("status", (event) => {
      console.log("Y-WebRTC connection status:", event.status);
      setConnectionStatus(event.status);
    });

    yProvider.connect();
    console.log("Y-WebRTC provider initialized and connected");

    // Add these for better debugging
    yProvider.on("synced", () => {
      console.log("Content synced with peers!");
    });

    // Log when peers connect
    yProvider.on("peers", (event) => {
      console.log("Peers changed:", event.webrtcPeers.length, "connected");
    });

    setYdoc(doc);
    setProvider(yProvider);

    return () => {
      console.log("Cleaning up Y.js resources");
      try {
        yProvider.disconnect();
        yProvider.destroy();
        doc.destroy();
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    };
  }, [roomId, inRoom]);

  // Sync Excalidraw with Yjs
  useEffect(() => {
    if (!excalidrawAPI || !ydoc) return;

    console.log("Setting up Yjs <-> Excalidraw sync");
    const yElements = ydoc.getArray("excalidraw-elements");

    // Initial load
    if (yElements.length > 0) {
      try {
        const initialElements = yElements.toArray();
        console.log("Loading initial elements:", initialElements.length);
        excalidrawAPI.updateScene({ elements: initialElements });
        setElements(initialElements);
      } catch (err) {
        console.error("Error loading initial elements:", err);
      }
    }

    // Update Excalidraw when Yjs changes
    const observer = (event) => {
      try {
        const remoteElements = yElements.toArray();
        console.log("Remote update received, elements:", remoteElements.length);
        excalidrawAPI.updateScene({ elements: remoteElements });
        setElements(remoteElements);
      } catch (err) {
        console.error("Error handling remote update:", err);
      }
    };

    yElements.observe(observer);

    return () => {
      console.log("Removing Yjs observers");
      yElements.unobserve(observer);
    };
  }, [excalidrawAPI, ydoc]);

  // Handle local changes in Excalidraw
  const onChange = useCallback(
    (newElements, appState, files) => {
      if (!ydoc || !newElements || !excalidrawAPI) return;

      try {
        // Simple change detection to prevent loops
        const hasChanged =
          JSON.stringify(newElements) !== JSON.stringify(elements);

        if (hasChanged) {
          console.log("Local change detected, elements:", newElements.length);

          // Update Yjs document (which will sync to other clients)
          ydoc.transact(() => {
            const array = ydoc.getArray("excalidraw-elements");
            array.delete(0, array.length);
            array.push(newElements);
          });

          // Update local state
          setElements(newElements);
        }
      } catch (err) {
        console.error("Error handling local change:", err);
      }
    },
    [ydoc, elements, excalidrawAPI]
  );

  return (
    <div className="whiteboard-section">
      <h2>
        Collaborative Whiteboard {roomId ? `(Room: ${roomId})` : ""}
        <span
          style={{
            marginLeft: "10px",
            fontSize: "0.8em",
            color: connectionStatus === "connected" ? "green" : "red",
          }}
        >
          {connectionStatus}
        </span>
      </h2>
      <div style={{ height: "600px", width: "100%", border: "1px solid #ccc" }}>
        {inRoom ? (
          <Excalidraw
            ref={(api) => setExcalidrawAPI(api)}
            onChange={onChange}
            zenModeEnabled={false}
            gridModeEnabled={true}
            viewModeEnabled={false}
            theme="light"
          />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <p>Join a room to use the whiteboard</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;

import React, { useState, useEffect } from "react";
import WebRTCService from "./services/WebRTCService";
import Chat from "../src/components/Chat";
import Controls from "../src/components/Control";
import LocalVideo from "../src/components/LocalVideo";
import Notification from "../src/components/Notification";
import VideoGrid from "../src/components/VideoGrid";
import Subtitles from "../src/components/Subtitles";
import WhiteboardContainer from "../src/components/WhiteboardContainer"; // Import the WhiteboardContainer
import "./App.css";
import { io } from "socket.io-client";

function App() {
  const [notification, setNotification] = useState("");
  const [webrtc, setWebrtc] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [subtitlesActive, setSubtitlesActive] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false); // State for whiteboard visibility

  // Initialize WebRTC service
  useEffect(() => {
    const pcConfig = {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
        {
          urls: "turn:192.158.29.39:3478?transport=udp",
          credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
          username: "28224511:1379330808",
        },
      ],
    };

    // Create WebRTC service instance
    const webrtcService = new WebRTCService(pcConfig, {
      log: true,
      warn: true,
      error: true,
    });
    webrtcService.init();
    setWebrtc(webrtcService);

    // Get local media stream
    webrtcService
      .getLocalStream(true, { width: 640, height: 480 })
      .then((stream) => {
        setLocalStream(stream);
      });

    // Set up event listeners
    webrtcService.addEventListener("notification", (e) => {
      setNotification(e.detail.notification);
    });

    webrtcService.addEventListener("createdRoom", (e) => {
      setNotification(`Room ${e.detail.roomId} was created`);
      setInRoom(true);
      setIsAdmin(true);
      webrtcService.gotStream();
    });

    webrtcService.addEventListener("joinedRoom", (e) => {
      setNotification(`Room ${e.detail.roomId} was joined`);
      setInRoom(true);
      webrtcService.gotStream();
    });

    webrtcService.addEventListener("leftRoom", (e) => {
      setNotification(`Left the room ${e.detail.roomId}`);
      setInRoom(false);
      setIsAdmin(false);
      setRemoteStreams({});
    });

    webrtcService.addEventListener("newUser", (e) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [e.detail.socketId]: {
          stream: e.detail.stream,
          userName: e.detail.userName,
        },
      }));
    });

    webrtcService.addEventListener("removeUser", (e) => {
      if (!e.detail.socketId) {
        // Remove all remote streams
        setRemoteStreams({});
        return;
      }

      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[e.detail.socketId];
        return newStreams;
      });
    });

    webrtcService.addEventListener("kicked", () => {
      setNotification("You were kicked out");
      setInRoom(false);
      setRemoteStreams({});
    });

    webrtcService.addEventListener("error", (e) => {
      setNotification(e.detail.error.message);
    });

    // Clean up event listeners on component unmount
    return () => {
      if (webrtcService) {
        webrtcService.removeEventListener("notification");
        webrtcService.removeEventListener("createdRoom");
        webrtcService.removeEventListener("joinedRoom");
        webrtcService.removeEventListener("leftRoom");
        webrtcService.removeEventListener("newUser");
        webrtcService.removeEventListener("removeUser");
        webrtcService.removeEventListener("kicked");
        webrtcService.removeEventListener("error");
      }
    };
  }, []);

  const handleJoinRoom = () => {
    if (!roomId) {
      setNotification("Room ID not provided");
      return;
    }

    if (!userName) {
      setNotification("Please enter your name");
      return;
    }

    webrtc.joinRoom(roomId, userName);
  };

  const handleLeaveRoom = () => {
    webrtc.leaveRoom();
  };

  const handleStartRecording = () => {
    webrtc.startRecording();
    setIsRecording(true);
    setNotification("Recording started...");
  };

  const handleStopRecording = () => {
    webrtc.stopRecording();
    setIsRecording(false);
    setNotification("Recording stopped");
  };

  const handleKickUser = (socketId) => {
    webrtc.kickUser(socketId);
  };

  const toggleSubtitles = () => {
    setSubtitlesActive(!subtitlesActive);
    setNotification(subtitlesActive ? "Subtitles Off" : "Subtitles On");
  };

  const toggleWhiteboard = () => {
    setShowWhiteboard(!showWhiteboard);
    setNotification(showWhiteboard ? "Whiteboard Hidden" : "Whiteboard Shown");
  };

  return (
    <div className="app">
      <h1>
        <i className="fa-solid fa-bolt"></i> Buzz Meet
      </h1>

      <Controls
  roomId={roomId}
  setRoomId={setRoomId}
  userName={userName}
  setUserName={setUserName}
  onJoin={handleJoinRoom}
  onLeave={handleLeaveRoom}
  onStartRecording={handleStartRecording}
  onStopRecording={handleStopRecording}
  isRecording={isRecording}
  inRoom={inRoom}
  onToggleSubtitles={toggleSubtitles}
  subtitlesActive={subtitlesActive}
  onToggleWhiteboard={toggleWhiteboard} // Pass the toggle function
  showWhiteboard={showWhiteboard} // Pass the whiteboard visibility state
/>
      <Notification message={notification} />

      <div className="videos-section" style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
        <div className="video-container" style={{ 
          flex: showWhiteboard ? '1' : '1',
          transition: 'flex 0.3s ease'
        }}>
          <VideoGrid
            remoteStreams={remoteStreams}
            isAdmin={isAdmin}
            onKickUser={handleKickUser}
          />

          {localStream && <LocalVideo stream={localStream} webrtc={webrtc} />}
        </div>

        {showWhiteboard && (
          <div className="whiteboard-area" style={{ flex: '1', padding: '10px' }}>
            <WhiteboardContainer 
              webRTCService={webrtc} 
              isActive={showWhiteboard} 
            />
          </div>
        )}
      </div>

      {inRoom && <Chat webrtc={webrtc} />}

      {subtitlesActive && <Subtitles localStream={localStream} />}
    </div>
  );
}

export default App;
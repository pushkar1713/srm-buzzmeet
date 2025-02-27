import React, { useState, useEffect } from "react";
import WebRTCService from "./services/WebRTCService";
import Chat from "../src/components/Chat";
import Controls from "../src/components/Control";
import LocalVideo from "../src/components/LocalVideo";
import Notification from "../src/components/Notification";
import VideoGrid from "../src/components/VideoGrid";
import Subtitles from "../src/components/Subtitles";
import "./App.css";
import { io } from "socket.io-client";

function App() {
  const [notification, setNotification] = useState({ message: "", type: "info" });
  const [webrtc, setWebrtc] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [subtitlesActive, setSubtitlesActive] = useState(false);

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
      ],
    };

    const webrtcService = new WebRTCService(pcConfig);
    webrtcService.init();
    setWebrtc(webrtcService);

    webrtcService
      .getLocalStream(true, { width: 640, height: 480 })
      .then((stream) => setLocalStream(stream));

    webrtcService.addEventListener("notification", (e) => {
      setNotification({ message: e.detail.notification, type: "info" });
    });

    webrtcService.addEventListener("createdRoom", (e) => {
      setNotification({ message: `Room ${e.detail.roomId} was created`, type: "success" });
      setInRoom(true);
      setIsAdmin(true);
      webrtcService.gotStream();
    });

    webrtcService.addEventListener("joinedRoom", (e) => {
      setNotification({ message: `Room ${e.detail.roomId} was joined`, type: "success" });
      setInRoom(true);
      webrtcService.gotStream();
    });

    webrtcService.addEventListener("leftRoom", (e) => {
      setNotification({ message: `Left the room ${e.detail.roomId}`, type: "warning" });
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
      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[e.detail.socketId];
        return newStreams;
      });
    });

    webrtcService.addEventListener("kicked", () => {
      setNotification({ message: "You were kicked out", type: "error" });
      setInRoom(false);
      setRemoteStreams({});
    });

    webrtcService.addEventListener("error", (e) => {
      setNotification({ message: e.detail.error.message, type: "error" });
    });

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
      setNotification({ message: "Room ID not provided", type: "warning" });
      return;
    }
    if (!userName) {
      setNotification({ message: "Please enter your name", type: "warning" });
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
    setNotification({ message: "Recording started...", type: "success" });
  };

  const handleStopRecording = () => {
    webrtc.stopRecording();
    setIsRecording(false);
    setNotification({ message: "Recording stopped", type: "info" });
  };

  const handleKickUser = (socketId) => {
    webrtc.kickUser(socketId);
  };

  const toggleSubtitles = () => {
    setSubtitlesActive(!subtitlesActive);
    setNotification({
      message: subtitlesActive ? "Subtitles Off" : "Subtitles On",
      type: "info",
    });
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
      />

      <Notification message={notification.message} type={notification.type} />

      <div className="videos-section">
        <VideoGrid remoteStreams={remoteStreams} isAdmin={isAdmin} onKickUser={handleKickUser} />
        {localStream && <LocalVideo stream={localStream} webrtc={webrtc} />}
      </div>

      {inRoom && <Chat webrtc={webrtc} />}
      {subtitlesActive && <Subtitles localStream={localStream} />}
    </div>
  );
}

export default App;

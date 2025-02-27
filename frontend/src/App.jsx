import React, { useState, useEffect } from "react";
import WebRTCService from "./services/WebRTCService";
import Chat from "./components/Chat";
import Controls from "./components/Control";
import LocalVideo from "./components/LocalVideo";
import Notification from "./components/Notification";
import VideoGrid from "./components/VideoGrid";
import Subtitles from "./components/Subtitles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";

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

  useEffect(() => {
    const pcConfig = {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    };

    const webrtcService = new WebRTCService(pcConfig);
    webrtcService.init();
    setWebrtc(webrtcService);

    webrtcService.getLocalStream(true, { width: 640, height: 480 }).then(setLocalStream);

    webrtcService.addEventListener("notification", (e) => setNotification(e.detail.notification));
    webrtcService.addEventListener("createdRoom", (e) => {
      setNotification(`Room ${e.detail.roomId} created`);
      setInRoom(true);
      setIsAdmin(true);
    });
    webrtcService.addEventListener("joinedRoom", (e) => {
      setNotification(`Joined room ${e.detail.roomId}`);
      setInRoom(true);
    });
    webrtcService.addEventListener("leftRoom", () => {
      setNotification("Left the room");
      setInRoom(false);
      setIsAdmin(false);
      setRemoteStreams({});
    });

    return () => {
      if (webrtcService) {
        ["notification", "createdRoom", "joinedRoom", "leftRoom"].forEach((event) =>
          webrtcService.removeEventListener(event)
        );
      }
    };
  }, []);

  const handleJoinRoom = () => {
    if (!webrtc) {
      setNotification("WebRTC is still initializing, please wait...");
      return;
    }
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
    if (webrtc) webrtc.leaveRoom();
  };

  const toggleSubtitles = () => {
    setSubtitlesActive(!subtitlesActive);
    setNotification(subtitlesActive ? "Subtitles Off" : "Subtitles On");
  };

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>
        <FontAwesomeIcon icon={faBolt} style={styles.icon} /> Buzz Meet
      </h1>

      <Controls
        roomId={roomId}
        setRoomId={setRoomId}
        userName={userName}
        setUserName={setUserName}
        onJoin={handleJoinRoom}
        onLeave={handleLeaveRoom}
        inRoom={inRoom}
        onToggleSubtitles={toggleSubtitles}
        subtitlesActive={subtitlesActive}
      />

      <Notification message={notification} />

      <div style={styles.videoSection}>
        <VideoGrid remoteStreams={remoteStreams} isAdmin={isAdmin} />
        {localStream && <LocalVideo stream={localStream} webrtc={webrtc} />}
      </div>

      {inRoom && <Chat webrtc={webrtc} />}
      {subtitlesActive && <Subtitles localStream={localStream} />}
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#041421",
    color: "#fff",
    textAlign: "center",
    padding: "20px",
  },
  title: {
    color: "#4C7273",
    fontSize: "2rem",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: "10px",
    color: "#4C7273",
  },
  videoSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: "20px",
  },
};

export default App;

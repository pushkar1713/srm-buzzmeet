import React from "react";

function Controls({
  roomId,
  setRoomId,
  userName,
  setUserName,
  onJoin,
  onLeave,
  onStartRecording,
  onStopRecording,
  isRecording,
  inRoom,
  onToggleSubtitles,
  subtitlesActive,
  onToggleWhiteboard,
  showWhiteboard,
}) {
  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        disabled={inRoom}
        style={styles.input}
      />

      <input
        type="text"
        placeholder="Your Name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        disabled={inRoom}
        style={styles.input}
      />

      <button onClick={onJoin} disabled={inRoom} style={styles.button}>
        <i className="fa-solid fa-arrow-right"></i> Join
      </button>

      <button onClick={onLeave} disabled={!inRoom} style={styles.button}>
        <i className="fa-solid fa-xmark"></i> Leave
      </button>

      <button
        onClick={onStartRecording}
        disabled={!inRoom || isRecording}
        style={{
          ...styles.button,
          backgroundColor: isRecording ? "#f44336" : "#4C7273",
        }}
      >
        <i className="fa-solid fa-circle"></i> Rec
      </button>

      <button
        onClick={onStopRecording}
        disabled={!inRoom || !isRecording}
        style={styles.button}
      >
        <i className="fa-solid fa-square"></i> Stop
      </button>

      <button
        onClick={onToggleSubtitles}
        disabled={!inRoom}
        style={{
          ...styles.button,
          backgroundColor: subtitlesActive ? "#4C7273" : "#041421",
        }}
      >
        💬 {subtitlesActive ? "Sub Off" : "Sub On"}
      </button>

      <button
        onClick={onToggleWhiteboard}
        disabled={!inRoom}
        style={{
          ...styles.button,
          backgroundColor: showWhiteboard ? "#4C7273" : "#041421",
        }}
      >
        🎨 {showWhiteboard ? "Hide Whiteboard" : "Show Whiteboard"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "15px",
    backgroundColor: "#041421",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    maxWidth: "100%",
    overflowX: "auto",
  },
  input: {
    padding: "8px",
    fontSize: "14px",
    width: "120px",
    borderRadius: "5px",
    border: "1px solid #4C7273",
    backgroundColor: "#041421",
    color: "#fff",
    outline: "none",
    textAlign: "center",
  },
  button: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "5px",
    color: "#fff",
    border: "1px solid #4C7273",
    cursor: "pointer",
    transition: "background 0.3s ease",
    backgroundColor: "#4C7273",
  },
};

export default Controls;
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
}) {
  return (
    <div className="controls">
      <div className="room-controls">
        <label htmlFor="roomId">Room ID</label>
        <input
          id="roomId"
          type="text"
          placeholder="Enter room ID..."
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={inRoom}
        />

        <label htmlFor="userName">Your Name</label>
        <input
          id="userName"
          type="text"
          placeholder="Enter your name..."
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          disabled={inRoom}
        />

        <button id="joinBtn" onClick={onJoin} disabled={inRoom}>
          Join Room
        </button>

        <button id="leaveBtn" onClick={onLeave} disabled={!inRoom}>
          Leave Room
        </button>
      </div>

      <div className="media-controls">
        <button
          id="recordBtn"
          onClick={onStartRecording}
          disabled={!inRoom || isRecording}
        >
          <span className="icon">
            <i className="fa-solid fa-microphone-lines"></i>
          </span>
          Record
        </button>

        <button
          id="stopRecordBtn"
          onClick={onStopRecording}
          disabled={!inRoom || !isRecording}
        >
          <span className="icon">⏹</span> Stop
        </button>

        <button
          id="startSpeechBtn"
          onClick={onToggleSubtitles}
          disabled={!inRoom}
          className={subtitlesActive ? "active" : ""}
        >
          <span className="icon">
            <i className="fa-solid fa-comment-dots"></i>
          </span>
          Subtitles {subtitlesActive ? "Off" : "On"}
        </button>
      </div>
    </div>
  );
}

export default Controls;

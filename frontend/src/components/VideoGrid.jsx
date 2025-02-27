import React from "react";


function VideoGrid({ remoteStreams, isAdmin, onKickUser }) {
  return (
    <div id="videoGrid" className="grid-container">
      {Object.entries(remoteStreams).map(([socketId, { stream, userName }]) => (
        <div key={socketId} className="grid-item" id={socketId}>
          <p>{userName || socketId}</p>
          <video
            autoPlay
            playsInline
            ref={(element) => {
              if (element && stream) {
                element.srcObject = stream;
              }
            }}
          />
          {isAdmin && (
            <button className="kick_btn" onClick={() => onKickUser(socketId)}>
              Kick
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default VideoGrid;

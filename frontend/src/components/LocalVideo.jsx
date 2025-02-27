import React, { useRef, useState, useEffect } from "react";

function LocalVideo({ stream, webrtc }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);

  // Set the stream to the video element when it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle mouse move and up events for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current && !isPinned) {
        const x = e.clientX - offset.x;
        const y = e.clientY - offset.y;

        // Ensure the window stays within the viewport
        const maxX = window.innerWidth - containerRef.current.offsetWidth;
        const maxY = window.innerHeight - containerRef.current.offsetHeight;

        setPosition({
          x: Math.min(Math.max(x, 0), maxX),
          y: Math.min(Math.max(y, 0), maxY),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = "auto";
      }
    };

    document.addEventListener("pointermove", handleMouseMove);
    document.addEventListener("pointerup", handleMouseUp);

    return () => {
      document.removeEventListener("pointermove", handleMouseMove);
      document.removeEventListener("pointerup", handleMouseUp);
    };
  }, [isDragging, offset, isPinned]);

  const handleMouseDown = (e) => {
    if (containerRef.current && !isPinned) {
      e.preventDefault(); // Prevent text selection during drag
      setIsDragging(true);
      document.body.style.cursor = "grabbing";

      // Calculate the direct offset from mouse to container corner
      const rect = containerRef.current.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const togglePin = () => {
    if (!isPinned) {
      // Pin karte waqt position ko validate karein
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      setPosition({
        x: Math.min(Math.max(position.x, 0), maxX),
        y: Math.min(Math.max(position.y, 0), maxY),
      });
    }

    setIsPinned(!isPinned);
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = "auto";
    }
  };

  const toggleMute = () => {
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const newMuteState = !isAudioMuted;
      audioTrack.enabled = !newMuteState;
      setIsAudioMuted(newMuteState);
    }
  };

  const toggleVideo = () => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const newVideoState = !isVideoOff;
      videoTrack.enabled = !newVideoState;
      setIsVideoOff(newVideoState);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "window",
          },
          audio: false,
        });

        // Set the screen share as the video source
        if (videoRef.current) {
          videoRef.current.srcObject = newScreenStream;
        }

        // Update WebRTC with screen stream
        webrtc.replaceVideoTrack(newScreenStream.getVideoTracks()[0]);

        // Handle when user stops sharing via browser UI
        newScreenStream.getVideoTracks()[0].addEventListener("ended", () => {
          stopScreenShare();
        });

        setScreenStream(newScreenStream);
        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // Restore camera stream
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    // Restore original video track
    if (stream && stream.getVideoTracks()[0]) {
      webrtc.replaceVideoTrack(stream.getVideoTracks()[0]);
    }

    setScreenStream(null);
    setIsScreenSharing(false);
  };

  return (
    <div
      id="localVideo-container"
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : isPinned ? "default" : "grab",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        border: `2px solid ${isPinned ? "#4C7273" : "transparent"}`,
        transition: "border-color 0.2s ease",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => {
        if (!isPinned) {
          const touch = e.touches[0];
          const rect = containerRef.current.getBoundingClientRect();
          setOffset({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
          });
          setIsDragging(true);
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 10,
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          style={{
            background: "#041421",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: "0.7",
            transition: "opacity 0.2s ease",
          }}
          onClick={togglePin}
          title={isPinned ? "Unpin window" : "Pin window"}
        >
          <i className={`fa-solid ${isPinned ? "fa-thumbtack" : "fa-map-pin"}`}></i>
        </button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background: "#000",
        }}
      />

      <div
        className="local-controls"
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          padding: "10px",
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        }}
      >
        <button
          className={`control-btn ${isAudioMuted ? "muted" : ""}`}
          onClick={toggleMute}
          style={{
            background: isAudioMuted ? "#f44336" : "#4C7273",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        >
          <span className="icon">
            <i
              className={`fa-solid ${
                isAudioMuted ? "fa-microphone-slash" : "fa-microphone-lines"
              }`}
            ></i>
          </span>
        </button>

        <button
          className={`control-btn ${isVideoOff ? "muted" : ""}`}
          onClick={toggleVideo}
          style={{
            background: isVideoOff ? "#f44336" : "#4C7273",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        >
          <span className="icon">
            <i
              className={`fa-solid ${
                isVideoOff ? "fa-video-slash" : "fa-video"
              }`}
            ></i>
          </span>
        </button>

        <button
          className={`control-btn ${isScreenSharing ? "active" : ""}`}
          onClick={toggleScreenShare}
          style={{
            background: isScreenSharing ? "#ff9800" : "#4C7273",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        >
          <span className="icon">
            <i className="fa-solid fa-desktop"></i>
          </span>
        </button>
      </div>
    </div>
  );
}

export default LocalVideo;
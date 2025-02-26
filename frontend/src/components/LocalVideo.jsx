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

  // Set the stream to the video element when it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Add mouse event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current) {
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
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, offset]);

  const handleMouseDown = (e) => {
    if (containerRef.current) {
      setIsDragging(true);
      setOffset({
        x: e.clientX - containerRef.current.getBoundingClientRect().left,
        y: e.clientY - containerRef.current.getBoundingClientRect().top,
      });
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
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
    >
      <video ref={videoRef} autoPlay playsInline muted />
      <div className="local-controls">
        <button
          className={`control-btn ${isAudioMuted ? "muted" : ""}`}
          onClick={toggleMute}
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

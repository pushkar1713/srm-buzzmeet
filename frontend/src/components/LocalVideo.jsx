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

  // Set the stream to the video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Dragging functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current) {
        const x = e.pageX - offset.x;
        const y = e.pageY - offset.y;

        // Ensure the window stays within bounds
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
      document.body.style.userSelect = "auto"; // Restore text selection
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
        x: e.pageX - containerRef.current.getBoundingClientRect().left,
        y: e.pageY - containerRef.current.getBoundingClientRect().top,
      });

      document.body.style.userSelect = "none"; // Prevent text selection
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
        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always", displaySurface: "window" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = newScreenStream;
        }

        webrtc.replaceVideoTrack(newScreenStream.getVideoTracks()[0]);

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

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    if (stream && stream.getVideoTracks()[0]) {
      webrtc.replaceVideoTrack(stream.getVideoTracks()[0]);
    }

    setScreenStream(null);
    setIsScreenSharing(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
        backgroundColor: "#222",
        padding: "10px",
        borderRadius: "10px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      onMouseDown={handleMouseDown}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "200px",
          height: "150px",
          borderRadius: "8px",
          backgroundColor: "black",
        }}
      />
      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button
          style={{
            backgroundColor: isAudioMuted ? "#ff4d4d" : "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={toggleMute}
        >
          <i
            className={`fa-solid ${
              isAudioMuted ? "fa-microphone-slash" : "fa-microphone-lines"
            }`}
          ></i>
        </button>

        <button
          style={{
            backgroundColor: isVideoOff ? "#ff4d4d" : "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={toggleVideo}
        >
          <i
            className={`fa-solid ${
              isVideoOff ? "fa-video-slash" : "fa-video"
            }`}
          ></i>
        </button>

        <button
          style={{
            backgroundColor: isScreenSharing ? "#ffa500" : "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={toggleScreenShare}
        >
          <i className="fa-solid fa-desktop"></i>
        </button>
      </div>
    </div>
  );
}

export default LocalVideo;

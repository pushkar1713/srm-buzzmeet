
import React, { useEffect, useRef, useState } from "react";

const Whiteboard = ({ webrtc, isVisible }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState("pen"); // 'pen' or 'eraser'

  useEffect(() => {
    if (!canvasRef.current || !webrtc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to container size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Redraw any existing content after resize
      const existingImage = localStorage.getItem("whiteboardData");
      if (existingImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = existingImage;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Handle incoming whiteboard data from other users
    const handleWhiteboardData = (e) => {
      if (!e.detail || !e.detail.data) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = e.detail.data;
      
      // Save to local storage
      localStorage.setItem("whiteboardData", e.detail.data);
    };

    webrtc.addEventListener("whiteboardData", handleWhiteboardData);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      webrtc.removeEventListener("whiteboardData", handleWhiteboardData);
    };
  }, [webrtc]);

  // Drawing functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    // Set drawing style
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.lineCap = "round";
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").closePath();
    setIsDrawing(false);

    // Send whiteboard data to other users
    if (webrtc) {
      const imageData = canvas.toDataURL("image/png");
      webrtc._sendMessage(
        { type: "whiteboard", data: imageData },
        null,
        webrtc.roomId
      );
      
      // Save locally
      localStorage.setItem("whiteboardData", imageData);
    }
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Send cleared whiteboard to other users
    if (webrtc) {
      const imageData = canvas.toDataURL("image/png");
      webrtc._sendMessage(
        { type: "whiteboard", data: imageData },
        null,
        webrtc.roomId
      );
      
      // Clear local storage
      localStorage.removeItem("whiteboardData");
    }
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <button
            style={{
              ...styles.toolButton,
              backgroundColor: tool === "pen" ? "#4C7273" : "#041421",
            }}
            onClick={() => setTool("pen")}
          >
            <i className="fa-solid fa-pen"></i>
          </button>
          <button
            style={{
              ...styles.toolButton,
              backgroundColor: tool === "eraser" ? "#4C7273" : "#041421",
            }}
            onClick={() => setTool("eraser")}
          >
            <i className="fa-solid fa-eraser"></i>
          </button>
        </div>
        
        <div style={styles.toolGroup}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={styles.colorPicker}
            disabled={tool === "eraser"}
          />
          <select
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            style={styles.brushSize}
          >
            <option value="1">Fine</option>
            <option value="3">Normal</option>
            <option value="5">Thick</option>
            <option value="10">Very Thick</option>
          </select>
        </div>
        
        <button style={styles.clearButton} onClick={clearWhiteboard}>
          Clear Board
        </button>
      </div>
      
      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "400px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px",
    backgroundColor: "#041421",
    borderBottom: "1px solid #4C7273",
  },
  toolGroup: {
    display: "flex",
    gap: "10px",
  },
  toolButton: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "5px",
    color: "#fff",
    border: "1px solid #4C7273",
    cursor: "pointer",
    transition: "background 0.3s ease",
  },
  colorPicker: {
    width: "30px",
    height: "30px",
    border: "none",
    outline: "none",
    cursor: "pointer",
  },
  brushSize: {
    padding: "5px",
    backgroundColor: "#041421",
    color: "#fff",
    border: "1px solid #4C7273",
    borderRadius: "5px",
  },
  clearButton: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "5px",
    color: "#fff",
    backgroundColor: "#d9534f",
    border: "none",
    cursor: "pointer",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#ffffff",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: "crosshair",
  },
};

export default Whiteboard;

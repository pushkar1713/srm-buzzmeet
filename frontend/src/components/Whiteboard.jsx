import React, { useEffect, useRef, useState } from 'react';

const Whiteboard = ({ webRTCService, whiteboardService }) => {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Setup the canvas and initialize the whiteboard
  useEffect(() => {
    if (!canvasRef.current || !whiteboardService) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set the canvas dimensions to match its display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Restore any saved canvas state after resize
      if (whiteboardService.getCanvasState) {
        whiteboardService.getCanvasState();
      }
    };
    
    // Initialize canvas size
    resizeCanvas();
    
    // Add window resize listener
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize the whiteboard service with the canvas
    whiteboardService.init(canvas, context);
    
    // Setup event handlers for drawing
    const handleMouseDown = (e) => {
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      whiteboardService.startDrawing(x, y);
    };
    
    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      whiteboardService.draw(x, y);
    };
    
    const handleMouseUp = () => {
      if (isDrawing) {
        whiteboardService.endDrawing();
        setIsDrawing(false);
      }
    };
    
    // Add touch support
    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setIsDrawing(true);
      whiteboardService.startDrawing(x, y);
    };
    
    const handleTouchMove = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      whiteboardService.draw(x, y);
    };
    
    const handleTouchEnd = (e) => {
      e.preventDefault();
      whiteboardService.endDrawing();
      setIsDrawing(false);
    };
    
    // Attach event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // When joining a room, request the current whiteboard state
    const handleJoin = () => {
      setTimeout(() => {
        whiteboardService.requestSync();
      }, 1000); // Give some time for connections to establish
    };
    
    if (webRTCService) {
      webRTCService.addEventListener('joinedRoom', handleJoin);
    }
    
    return () => {
      // Cleanup all event listeners
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', resizeCanvas);
      
      if (webRTCService) {
        webRTCService.removeEventListener('joinedRoom', handleJoin);
      }
      
      // Destroy the whiteboard service
      whiteboardService.destroy();
    };
  }, [whiteboardService, webRTCService]);
  
  // Update whiteboard settings when changed
  useEffect(() => {
    if (whiteboardService) {
      whiteboardService.setColor(color);
    }
  }, [color, whiteboardService]);
  
  useEffect(() => {
    if (whiteboardService) {
      whiteboardService.setSize(size);
    }
  }, [size, whiteboardService]);
  
  useEffect(() => {
    if (whiteboardService) {
      whiteboardService.setTool(tool);
    }
  }, [tool, whiteboardService]);
  
  return (
    <div className="whiteboard-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="whiteboard-toolbar" style={{ display: 'flex', padding: '10px', borderBottom: '1px solid #ddd' }}>
        <div className="tool-group" style={{ marginRight: '15px' }}>
          <label htmlFor="color-picker">Color: </label>
          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        
        <div className="tool-group" style={{ marginRight: '15px' }}>
          <label htmlFor="size-slider">Size: </label>
          <input
            id="size-slider"
            type="range"
            min="1"
            max="20"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
          />
          <span>{size}px</span>
        </div>
        
        <div className="tool-group" style={{ marginRight: '15px' }}>
          <label htmlFor="tool-select">Tool: </label>
          <select
            id="tool-select"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
          >
            <option value="pen">Pen</option>
            <option value="eraser">Eraser</option>
          </select>
        </div>
        
        <button
          onClick={() => whiteboardService.clearCanvas()}
          style={{ marginRight: '10px', padding: '5px 10px' }}
        >
          Clear All
        </button>
        
        <button
          onClick={() => whiteboardService.undo()}
          style={{ padding: '5px 10px' }}
        >
          Undo
        </button>
      </div>
      
      <div className="canvas-container" style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none' }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
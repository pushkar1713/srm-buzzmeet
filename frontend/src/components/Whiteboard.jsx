// src/components/Whiteboard.jsx
import React, { useEffect, useRef, useState } from 'react';

const Whiteboard = ({ webRTCService, whiteboardService }) => {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState('pen');
  
  useEffect(() => {
    // Initialize the whiteboard when component mounts
    if (canvasRef.current && webRTCService) {
      whiteboardService.init(canvasRef.current);
      
      // When joining a room, request the current whiteboard state
      const handleJoin = () => {
        setTimeout(() => {
          whiteboardService.requestSync();
        }, 1000); // Give some time for connections to establish
      };
      
      webRTCService.addEventListener('joinedRoom', handleJoin);
      
      return () => {
        // Cleanup
        whiteboardService.destroy();
        webRTCService.removeEventListener('joinedRoom', handleJoin);
      };
    }
  }, [webRTCService, whiteboardService]);
  
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
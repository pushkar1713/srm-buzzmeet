// src/components/WhiteboardContainer.jsx
import React, { useEffect, useState } from 'react';
import Whiteboard from './Whiteboard';
import WhiteboardService from '../services/WhiteboardService';

const WhiteboardContainer = ({ webRTCService, isActive = false }) => {
  const [whiteboardService] = useState(() => new WhiteboardService(webRTCService));
  
  return (
    <div className="whiteboard-wrapper" style={{ 
      height: '100%', 
      display: isActive ? 'block' : 'none',
      background: '#f5f5f5',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {isActive && (
        <Whiteboard 
          webRTCService={webRTCService} 
          whiteboardService={whiteboardService} 
        />
      )}
    </div>
  );
};

export default WhiteboardContainer;
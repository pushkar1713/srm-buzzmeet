// src/services/WhiteboardService.js
class WhiteboardService {
    constructor(webRTCService) {
      this.webRTCService = webRTCService;
      this.canvas = null;
      this.ctx = null;
      this.drawing = false;
      this.currentColor = '#000000';
      this.currentSize = 5;
      this.currentTool = 'pen';
      this.paths = []; // Store drawing paths for new users
      this.undoStack = []; // Store for undo functionality
  
      // Bind methods
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
  
    // Initialize the whiteboard
    init(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      
      // Set canvas to full container size
      this.resizeCanvas();
      
      // Add event listeners
      this.canvas.addEventListener('mousedown', this.handleMouseDown);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseup', this.handleMouseUp);
      this.canvas.addEventListener('mouseleave', this.handleMouseUp);
      
      // Touch support
      this.canvas.addEventListener('touchstart', this.handleTouchStart);
      this.canvas.addEventListener('touchmove', this.handleTouchMove);
      this.canvas.addEventListener('touchend', this.handleTouchEnd);
      
      // Listen for whiteboard events from peers
      this.webRTCService.addEventListener('whiteboardData', this.handleWhiteboardData.bind(this));
      
      // Window resize
      window.addEventListener('resize', this.resizeCanvas.bind(this));
      
      return this;
    }
  
    resizeCanvas() {
      if (this.canvas) {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Redraw content after resize
        this.redrawPaths();
      }
    }
  
    // Handle mouse events
    handleMouseDown(e) {
      this.drawing = true;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.startPath(x, y);
    }
  
    handleMouseMove(e) {
      if (!this.drawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.continuePath(x, y);
    }
  
    handleMouseUp() {
      if (this.drawing) {
        this.endPath();
        this.drawing = false;
      }
    }
  
    // Handle touch events
    handleTouchStart(e) {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.drawing = true;
        this.startPath(x, y);
      }
    }
  
    handleTouchMove(e) {
      e.preventDefault();
      if (!this.drawing) return;
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.continuePath(x, y);
      }
    }
  
    handleTouchEnd(e) {
      e.preventDefault();
      if (this.drawing) {
        this.endPath();
        this.drawing = false;
      }
    }
  
    // Drawing operations
    startPath(x, y) {
      // Create a new path
      const path = {
        tool: this.currentTool,
        color: this.currentColor,
        size: this.currentSize,
        points: [{x, y}]
      };
      
      // Start drawing
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentSize;
      
      // Store the current path
      this.paths.push(path);
      
      // Send the start event to peers
      this.sendDrawEvent('start', path);
    }
  
    continuePath(x, y) {
      // Continue the current path
      if (this.paths.length > 0) {
        const currentPath = this.paths[this.paths.length - 1];
        currentPath.points.push({x, y});
        
        // Draw a line to the new point
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Send the move event to peers
        this.sendDrawEvent('move', {
          index: this.paths.length - 1,
          point: {x, y}
        });
      }
    }
  
    endPath() {
      // Complete the path
      this.ctx.closePath();
      
      // Send the end event to peers
      this.sendDrawEvent('end', {});
    }
  
    // Send drawing events to other peers
    sendDrawEvent(eventType, data) {
      if (this.webRTCService.room) {
        this.webRTCService._sendMessage({
          type: 'whiteboard',
          action: eventType,
          data: data
        }, null, this.webRTCService.room);
      }
    }
  
    // Handle incoming whiteboard data from peers
    handleWhiteboardData(event) {
      const { action, data } = event.detail;
      
      switch (action) {
        case 'start':
          this.handleRemotePathStart(data);
          break;
        case 'move':
          this.handleRemotePathContinue(data);
          break;
        case 'end':
          this.handleRemotePathEnd();
          break;
        case 'clear':
          this.clearCanvas(false); // Don't broadcast again
          break;
        case 'fullSync':
          this.syncFromPeer(data);
          break;
        case 'requestSync':
          this.sendFullSync();
          break;
      }
    }
  
    // Handle remote drawing events
    handleRemotePathStart(pathData) {
      // Add the path to our collection
      this.paths.push(pathData);
      
      // Start drawing
      this.ctx.beginPath();
      this.ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = pathData.color;
      this.ctx.lineWidth = pathData.size;
    }
  
    handleRemotePathContinue(data) {
      if (this.paths.length > data.index) {
        // Add the point to the path
        this.paths[data.index].points.push(data.point);
        
        // Draw the point
        this.ctx.lineTo(data.point.x, data.point.y);
        this.ctx.stroke();
      }
    }
  
    handleRemotePathEnd() {
      this.ctx.closePath();
    }
  
    // Tool operations
    setColor(color) {
      this.currentColor = color;
    }
  
    setSize(size) {
      this.currentSize = size;
    }
  
    setTool(tool) {
      this.currentTool = tool;
    }
  
    clearCanvas(broadcast = true) {
      // Save the current state for undo
      this.saveCanvasState();
      
      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.paths = [];
      
      // Broadcast the clear action
      if (broadcast) {
        this.sendDrawEvent('clear', {});
      }
    }
  
    // Undo/Redo functionality
    saveCanvasState() {
      // Create a copy of the current paths
      this.undoStack.push(JSON.parse(JSON.stringify(this.paths)));
      
      // Limit the undo stack size
      if (this.undoStack.length > 20) {
        this.undoStack.shift();
      }
    }
  
    undo() {
      if (this.undoStack.length > 0) {
        // Get the previous state
        this.paths = this.undoStack.pop();
        
        // Redraw
        this.redrawPaths();
        
        // Sync with peers
        this.sendFullSync();
      }
    }
  
    redrawPaths() {
      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Redraw all paths
      for (const path of this.paths) {
        if (path.points.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(path.points[0].x, path.points[0].y);
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          this.ctx.strokeStyle = path.color;
          this.ctx.lineWidth = path.size;
          
          for (let i = 1; i < path.points.length; i++) {
            this.ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          
          this.ctx.stroke();
          this.ctx.closePath();
        }
      }
    }
  
    // Sync functionality for new users
    requestSync() {
      if (this.webRTCService.room) {
        this.sendDrawEvent('requestSync', {});
      }
    }
  
    sendFullSync() {
      if (this.webRTCService.room) {
        this.sendDrawEvent('fullSync', this.paths);
      }
    }
  
    syncFromPeer(paths) {
      this.paths = paths;
      this.redrawPaths();
    }
  
    // Cleanup
    destroy() {
      // Remove event listeners
      if (this.canvas) {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      }
      
      window.removeEventListener('resize', this.resizeCanvas.bind(this));
      this.webRTCService.removeEventListener('whiteboardData', this.handleWhiteboardData.bind(this));
    }
  }
  
  export default WhiteboardService;
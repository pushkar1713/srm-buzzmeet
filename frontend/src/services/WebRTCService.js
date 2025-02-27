import { io } from "socket.io-client";

class WebRTCService {
  constructor(
    pcConfig = null,
    logging = { log: true, warn: true, error: true },
    config = {}
  ) {
    this.room = null;
    this.socket = null;
    this.pcConfig = pcConfig || {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
        {
          urls: "turn:192.158.29.39:3478?transport=udp",
          credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
          username: "28224511:1379330808",
        },
      ],
    };

    this._myId = null;
    this._myName = null;
    this.pcs = {}; // Peer connections
    this.streams = {};
    this.currentRoom = null;
    this.inCall = false;
    this.isReady = false; // At least 2 users are in room
    this.isInitiator = false; // Initiates connections if true
    this._isAdmin = false; // Should be checked on the server
    this._localStream = null;
    this._mediaRecorder = null;
    this._recordedChunks = [];
    this.eventListeners = {};
    
    // Hardcoded Gemini API key as requested
    this.geminiKey = "AIzaSyBrpwAvs2d5KyXmatO_j2zFDPZojqoOEI0";
    this.chatHistory = {}; // Store conversation history per room

    // Manage logging
    this.log = logging.log ? console.log : () => {};
    this.warn = logging.warn ? console.warn : () => {};
    this.error = logging.error ? console.error : () => {};
  }

  // Initialize socket connection
  init() {
    this.socket = io("https://srm-buzzmeet-backend.onrender.com");
    this._onSocketListeners();
    return this;
  }

  // Custom event management
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  _emit(eventName, details) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach((callback) => {
        callback({ detail: details });
      });
    }
  }

  sendChatMessage(message) {
    if (!this.room) {
      this.warn("You are not in a room");
      return;
    }

    // Check if the message is for the chatbot
    if (message.startsWith("@ai")) {
      const prompt = message.slice(3).trim(); // Extract the prompt after "@ai"
      this._handleChatbotPrompt(prompt);
      return;
    }

    // Send regular chat message to everyone in the room
    this._sendMessage(
      { type: "chat", message, senderName: this._myName },
      null, // Send to all users (broadcast)
      this.room
    );

    // Emit the message locally so the sender can see it
    this._emit("chatMessage", {
      message: message,
      senderName: this._myName,
    });
  }

  async _handleChatbotPrompt(prompt) {
    // Check if Gemini API key is available
    if (!this.geminiKey) {
      const errorMessage = "Gemini API key is not configured. Please set it up to use the AI bot.";
      this._sendMessage(
        { type: "chat", message: errorMessage, senderName: "AI Bot" },
        null,
        this.room
      );
      
      this._emit("chatMessage", {
        message: errorMessage,
        senderName: "AI Bot",
      });
      
      this.error("Gemini API Error: Missing API key");
      return;
    }

    // Show a "typing" indicator
    this._sendMessage(
      { type: "chat", message: "Thinking...", senderName: "AI Bot (typing)" },
      null,
      this.room
    );

    try {
      // Initialize chat history for this room if it doesn't exist
      if (!this.chatHistory[this.room]) {
        this.chatHistory[this.room] = [];
      }

      // Add the user's message to chat history
      this.chatHistory[this.room].push({
        role: "user",
        parts: [{ text: prompt }]
      });

      // Prepare the chat request
      const chatHistory = this.chatHistory[this.room];
      
      // Call the Gemini API
      const response = await this._callGeminiAPI(prompt, chatHistory);

      // Add the AI's response to chat history
      this.chatHistory[this.room].push({
        role: "model",
        parts: [{ text: response }]
      });

      // Broadcast the AI's response to everyone in the room
      this._sendMessage(
        { type: "chat", message: response, senderName: "AI Bot" },
        null, // Send to all users (broadcast)
        this.room
      );

      // Emit the AI's response locally so the sender can see it
      this._emit("chatMessage", {
        message: response,
        senderName: "AI Bot",
      });
    } catch (error) {
      // Handle errors
      const errorMessage = `Sorry, I encountered an error: ${error.message}`;
      this._sendMessage(
        { type: "chat", message: errorMessage, senderName: "AI Bot" },
        null,
        this.room
      );
      
      this._emit("chatMessage", {
        message: errorMessage,
        senderName: "AI Bot",
      });
      
      this.error("Gemini API Error:", error);
    }
  }

  async _callGeminiAPI(prompt, chatHistory) {
    try {
      // Use the hardcoded API key
      const apiKey = this.geminiKey;
      
      // Updated API URL - using v1 instead of v1beta
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
      
      const requestBody = {
        contents: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };
  
      this.log("Sending request to Gemini API");
  
      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        this.error("Gemini API error response:", errorData);
        throw new Error(errorData.error?.message || "Unknown API error");
      }
  
      const data = await response.json();
      
      // Extract the response text from Gemini
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I'm sorry, I couldn't generate a response.";
        
      return generatedText;
    } catch (error) {
      this.error("Error calling Gemini API:", error);
      throw error;
    }
  }
  get localStream() {
    return this._localStream;
  }

  get myId() {
    return this._myId;
  }

  get isAdmin() {
    return this._isAdmin;
  }

  get roomId() {
    return this.room;
  }

  get participants() {
    return Object.keys(this.pcs);
  }

  gotStream() {
    if (this.room) {
      this._sendMessage({ type: "gotstream" }, null, this.room);
    } else {
      this.warn("Should join room before sending stream");

      this._emit("notification", {
        notification: `Should join room before sending a stream.`,
      });
    }
  }

  joinRoom(room, userName) {
    if (this.room) {
      this.warn("Leave current room before joining a new one");
      this._emit("notification", {
        notification: `Leave current room before joining a new one`,
      });
      return;
    }
    if (!room) {
      this.warn("Room ID not provided");
      this._emit("notification", {
        notification: `Room ID not provided`,
      });
      return;
    }
    this._myName = userName; // Store the user's name
    this.socket.emit("create or join", room, userName); // Send the name to the server
  }

  leaveRoom() {
    if (!this.room) {
      this.warn("You are currently not in a room");

      this._emit("notification", {
        notification: `You are currently not in a room`,
      });
      return;
    }
    this.isInitiator = false;
    this.socket.emit("leave room", this.room);
    
    // Clear chat history for this room
    if (this.chatHistory[this.room]) {
      delete this.chatHistory[this.room];
    }
  }

  // Get local stream
  getLocalStream(audioConstraints, videoConstraints) {
    return navigator.mediaDevices
      .getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      })
      .then((stream) => {
        this.log("Got local stream.");
        this._localStream = stream;
        return stream;
      })
      .catch(() => {
        this.error("Can't get usermedia");

        this._emit("error", {
          error: new Error(`Can't get usermedia`),
        });
      });
  }

  startRecording() {
    if (!this._localStream) {
      this.warn("No local stream available for recording");
      return;
    }

    // Extract audio tracks (optional: filter only audio)
    const audioTracks = this._localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      this.warn("No audio track available in local stream");
      return;
    }

    // Create stream with audio only
    const audioStream = new MediaStream(audioTracks);

    // Initialize MediaRecorder
    this._recordedChunks = [];
    this._mediaRecorder = new MediaRecorder(audioStream);

    // Collect data during recording
    this._mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this._recordedChunks.push(event.data);
      }
    };

    // When stopped, emit the recorded audio
    this._mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this._recordedChunks, { type: "audio/webm" });
      this._emit("recordingComplete", { audioBlob });
    };

    this._mediaRecorder.start();
    this.log("Recording started");
  }

  stopRecording() {
    if (this._mediaRecorder && this._mediaRecorder.state === "recording") {
      this._mediaRecorder.stop();
      this.log("Recording stopped");
    }
  }

  replaceVideoTrack(track) {
    if (!this._localStream) {
      this.warn("No local stream available");
      return;
    }

    // Replace track in local stream
    const oldTrack = this._localStream.getVideoTracks()[0];
    if (oldTrack) {
      this._localStream.removeTrack(oldTrack);
      this._localStream.addTrack(track);
    }

    // Replace track in all peer connections
    Object.values(this.pcs).forEach((pc) => {
      const senders = pc.getSenders();
      const sender = senders.find((s) => s.track && s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(track);
      }
    });
  }

  /**
   * Try connecting to peers
   * if got local stream and is ready for connection
   */
  _connect(socketId) {
    if (typeof this._localStream !== "undefined" && this.isReady) {
      this.log("Create peer connection to ", socketId);

      this._createPeerConnection(socketId);
      this.pcs[socketId].addStream(this._localStream);

      if (this.isInitiator) {
        this.log("Creating offer for ", socketId);

        this._makeOffer(socketId);
      }
    } else {
      this.warn("NOT connecting");
    }
  }

  /**
   * Initialize listeners for socket.io events
   */
  _onSocketListeners() {
    this.log("socket listeners initialized");

    // Room got created
    this.socket.on("created", (room, socketId, userName) => {
      this.room = room;
      this._myId = socketId;
      this._myName = userName; // Store the user's name
      this.isInitiator = true;
      this._isAdmin = true;

      this._emit("createdRoom", { roomId: room, userName: userName });
    });

    // Joined the room
    this.socket.on("joined", (room, socketId, userName) => {
      this.log("joined: " + room);

      this.room = room;
      this.isReady = true;
      this._myId = socketId;
      this._myName = userName; // Store the user's name

      this._emit("joinedRoom", { roomId: room, userName: userName });
    });

    // Left the room
    this.socket.on("left room", (room) => {
      if (room === this.room) {
        this.warn(`Left the room ${room}`);

        this.room = null;
        this._removeUser();
        
        // Clear chat history for this room
        if (this.chatHistory[room]) {
          delete this.chatHistory[room];
        }
        
        this._emit("leftRoom", {
          roomId: room,
        });
      }
    });

    // Someone joins room
    this.socket.on("join", (room) => {
      this.log("Incoming request to join room: " + room);

      this.isReady = true;

      // Dispatch custom event
      this._emit("newJoin");
    });

    // Room is ready for connection
    this.socket.on("ready", (user) => {
      this.log("User: ", user, " joined room");

      if (user !== this._myId && this.inCall) this.isInitiator = true;
    });

    // Someone got kicked from call
    this.socket.on("kickout", (socketId) => {
      this.log("kickout user: ", socketId);

      if (socketId === this._myId) {
        // You got kicked out
        this._emit("kicked");
        this._removeUser();
      } else {
        // Someone else got kicked out
        this._removeUser(socketId);
      }
    });

    // Logs from server
    this.socket.on("log", (log) => {
      this.log.apply(console, log);
    });

    /**
     * Message from the server
     * Manage stream and sdp exchange between peers
     */
    this.socket.on("message", (message, socketId) => {
      this.log("From", socketId, " received:", message.type);

      // Handle chat messages
      if (message.type === "chat") {
        this._emit("chatMessage", {
          message: message.message,
          senderName: message.senderName,
        });
        return;
      }

      // Participant leaves
      if (message.type === "leave") {
        this.log(socketId, "Left the call.");
        this._removeUser(socketId);
        this.isInitiator = true;

        this._emit("userLeave", { socketId: socketId });
        return;
      }

      // Avoid duplicate connections
      if (
        this.pcs[socketId] &&
        this.pcs[socketId].connectionState === "connected"
      ) {
        this.log("Connection with ", socketId, "is already established");
        return;
      }

      switch (message.type) {
        case "gotstream": // user is ready to share their stream
          this._connect(socketId);
          break;
        case "offer": // got connection offer
          if (!this.pcs[socketId]) {
            this._connect(socketId);
          }
          this.pcs[socketId].setRemoteDescription(
            new RTCSessionDescription(message)
          );
          this._answer(socketId);
          break;
        case "answer": // got answer for sent offer
          this.pcs[socketId].setRemoteDescription(
            new RTCSessionDescription(message)
          );
          break;
        case "candidate": // received candidate sdp
          this.inCall = true;
          const candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate,
          });
          this.pcs[socketId].addIceCandidate(candidate);
          break;
      }
    });
  }

  _sendMessage(message, toId = null, roomId = null) {
    this.socket.emit("message", message, toId, roomId);
  }

  _createPeerConnection(socketId) {
    try {
      if (this.pcs[socketId]) {
        // Skip peer if connection is already established
        this.warn("Connection with ", socketId, " already established");
        return;
      }

      this.pcs[socketId] = new RTCPeerConnection(this.pcConfig);
      this.pcs[socketId].onicecandidate = this._handleIceCandidate.bind(
        this,
        socketId
      );
      this.pcs[socketId].ontrack = this._handleOnTrack.bind(this, socketId);

      this.log("Created RTCPeerConnnection for ", socketId);
    } catch (error) {
      this.error("RTCPeerConnection failed: " + error.message);

      this._emit("error", {
        error: new Error(`RTCPeerConnection failed: ${error.message}`),
      });
    }
  }

  /**
   * Send ICE candidate through signaling server (socket.io in this case)
   */
  _handleIceCandidate(socketId, event) {
    this.log("icecandidate event");

    if (event.candidate) {
      this._sendMessage(
        {
          type: "candidate",
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
        },
        socketId
      );
    }
  }

  _handleCreateOfferError(event) {
    this.error("ERROR creating offer");

    this._emit("error", {
      error: new Error("Error while creating an offer"),
    });
  }

  /**
   * Make an offer
   * Creates session description
   */
  _makeOffer(socketId) {
    this.log("Sending offer to ", socketId);

    this.pcs[socketId].createOffer(
      this._setSendLocalDescription.bind(this, socketId),
      this._handleCreateOfferError
    );
  }

  /**
   * Create an answer for incoming offer
   */
  _answer(socketId) {
    this.log("Sending answer to ", socketId);

    this.pcs[socketId]
      .createAnswer()
      .then(
        this._setSendLocalDescription.bind(this, socketId),
        this._handleSDPError
      );
  }

  /**
   * Set local description and send it to server
   */
  _setSendLocalDescription(socketId, sessionDescription) {
    this.pcs[socketId].setLocalDescription(sessionDescription);
    this._sendMessage(sessionDescription, socketId);
  }

  _handleSDPError(error) {
    this.log("Session description error: " + error.toString());

    this._emit("error", {
      error: new Error(`Session description error: ${error.toString()}`),
    });
  }

  _handleOnTrack(socketId, event) {
    this.log("Remote stream added for ", socketId);

    if (this.streams[socketId]?.id !== event.streams[0].id) {
      this.streams[socketId] = event.streams[0];

      this._emit("newUser", {
        socketId,
        stream: event.streams[0],
        userName: this._myName, // Include the user's name
      });
    }
  }

  _handleUserLeave(socketId) {
    this.log(socketId, "Left the call.");
    this._removeUser(socketId);
    this.isInitiator = false;
  }

  _removeUser(socketId = null) {
    if (!socketId) {
      // close all connections
      for (const [key, value] of Object.entries(this.pcs)) {
        this.log("closing", value);
        value.close();
        delete this.pcs[key];
      }
      this.streams = {};
    } else {
      if (!this.pcs[socketId]) return;
      this.pcs[socketId].close();
      delete this.pcs[socketId];

      delete this.streams[socketId];
    }

    this._emit("removeUser", { socketId });
  }

  kickUser(socketId) {
    if (!this.isAdmin) {
      this._emit("notification", {
        notification: "You are not an admin",
      });
      return;
    }
    this._removeUser(socketId);
    this.socket.emit("kickout", socketId, this.room);
  }
}

export default WebRTCService;
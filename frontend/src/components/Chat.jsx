import React, { useState, useEffect, useRef } from "react";

function Chat({ webrtc }) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Set up event listener for incoming chat messages
  useEffect(() => {
    const handleChatMessage = (e) => {
      setChatMessages((prev) => [
        ...prev,
        {
          message: e.detail.message,
          senderName: e.detail.senderName,
        },
      ]);
    };

    webrtc.addEventListener("chatMessage", handleChatMessage);

    return () => {
      webrtc.removeEventListener("chatMessage", handleChatMessage);
    };
  }, [webrtc]);

  const handleSendMessage = () => {
    if (message.trim()) {
      webrtc.sendChatMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div id="chat-container">
      <div id="chat-messages">
        {chatMessages.map((msg, index) => (
          <div key={index} className="chat-message">
            <strong>{msg.senderName}: </strong>
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div id="chat-input-container">
        <input
          id="chat-input"
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button id="send-chat-btn" onClick={handleSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;

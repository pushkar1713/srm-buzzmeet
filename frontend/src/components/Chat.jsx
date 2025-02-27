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
    <div 
      id="chat-container" 
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(4, 20, 33, 0.15)",
        backgroundColor: "#ffffff",
        border: "1px solid #e0e5e6"
      }}
    >
      <div 
        id="chat-messages" 
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          backgroundColor: "#f5f8f8",
          backgroundImage: "linear-gradient(to bottom, rgba(76, 114, 115, 0.05), rgba(4, 20, 33, 0.03))"
        }}
      >
        {chatMessages.map((msg, index) => (
          <div 
            key={index} 
            className="chat-message" 
            style={{
              margin: "8px 0",
              padding: "12px 16px",
              borderRadius: "12px",
              backgroundColor: msg.senderName === "Me" ? "#4C7273" : "#ffffff",
              color: msg.senderName === "Me" ? "#ffffff" : "#041421",
              alignSelf: msg.senderName === "Me" ? "flex-end" : "flex-start",
              boxShadow: "0 1px 2px rgba(4, 20, 33, 0.1)",
              maxWidth: "80%",
              wordBreak: "break-word",
              lineHeight: "1.4",
              display: "inline-block"
            }}
          >
            <strong style={{ 
              color: msg.senderName === "Me" ? "#ffffff" : "#4C7273"
            }}>
              {msg.senderName}: 
            </strong>{" "}
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div 
        id="chat-input-container" 
        style={{
          display: "flex",
          padding: "12px 16px",
          borderTop: "1px solid #e0e5e6",
          backgroundColor: "#ffffff"
        }}
      >
        <input
          id="chat-input"
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            border: "1px solid #e0e5e6",
            borderRadius: "20px",
            padding: "10px 16px",
            fontSize: "14px",
            outline: "none",
            color: "#041421",
            transition: "border-color 0.2s",
            marginRight: "10px",
            "&:focus": {
              borderColor: "#4C7273"
            }
          }}
        />
        <button 
          id="send-chat-btn" 
          onClick={handleSendMessage}
          style={{
            backgroundColor: "#4C7273",
            color: "#ffffff",
            border: "none",
            borderRadius: "20px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s",
            "&:hover": {
              backgroundColor: "#3a5a5b"
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
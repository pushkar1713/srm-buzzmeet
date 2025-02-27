import React, { useState, useEffect } from "react";
import "./Notification.css";

function Notification({ message, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Check if onClose is a function before calling it
        if (typeof onClose === "function") {
          onClose();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  // If there's no message, don't render the notification
  if (!message) {
    return null;
  }

  return (
    <div className={`notification ${visible ? "visible" : "hidden"}`}>
      {message}
    </div>
  );
}

// Add default prop for onClose to prevent errors
Notification.defaultProps = {
  onClose: () => {}, // Default empty function
};

export default Notification;
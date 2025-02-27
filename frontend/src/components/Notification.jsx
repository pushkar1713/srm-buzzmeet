import React, { useState, useEffect } from "react";
import "./Notification.css";

function Notification({ message, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <div className={`notification ${visible ? "visible" : "hidden"}`}>
      {message}
    </div>
  );
}

export default Notification;

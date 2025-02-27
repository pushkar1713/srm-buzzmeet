import React, { useEffect, useState } from "react";
import "./Notification.css"
function Notification({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <p id="notification" className={visible ? "visible" : "hidden"}>
      {message}
    </p>
  );
}

export default Notification;

import React, { useState, useEffect } from "react";

function Subtitles() {
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if (!("webkitSpeechRecognition" in window)) {
      console.log("Speech recognition not supported");
      return;
    }

    // Setup speech recognition
    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "en-US";

    recognitionInstance.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionInstance.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "no-speech") {
        console.log("No speech detected");
      } else if (event.error === "audio-capture") {
        console.log("No microphone available");
      }
    };

    recognitionInstance.start();

    return () => {
      recognitionInstance.stop();
    };
  }, []);

  return (
    <div id="subtitles-container">
      <p id="subtitles">{transcript}</p>
    </div>
  );
}

export default Subtitles;
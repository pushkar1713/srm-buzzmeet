import React, { useReducer, useEffect } from "react";

// Reducer function to manage transcript state
const transcriptReducer = (state, action) => {
  switch (action.type) {
    case "ADD_FINAL":
      return { ...state, final: state.final + action.payload + "\n" }; // Add new line for paragraphs
    case "ADD_INTERIM":
      return { ...state, interim: action.payload };
    case "CLEAR_INTERIM":
      return { ...state, interim: "" };
    default:
      return state;
  }
};

function Subtitles() {
  // Use useReducer to manage transcript state
  const [state, dispatch] = useReducer(transcriptReducer, {
    final: "", // Stores final transcript
    interim: "", // Stores interim transcript
  });

  // Autosave transcript to local storage whenever it changes
  useEffect(() => {
    if (state.final || state.interim) {
      const fullTranscript = state.final + state.interim;
      localStorage.setItem("meeting_transcript", fullTranscript);
    }
  }, [state.final, state.interim]);

  // Autosave transcript to TXT file every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.final || state.interim) {
        const fullTranscript = state.final + state.interim;
        const blob = new Blob([fullTranscript], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = `meeting_transcript_${new Date().toISOString()}.txt`; // Dynamic file name
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
      }
    }, 60000); // Autosave every 60 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [state.final, state.interim]);

  // Speech recognition setup
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      console.log("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "en-US";

    recognitionInstance.onresult = (event) => {
      let newInterimTranscript = "";
      let newFinalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript + " "; // Add space for better readability
        } else {
          newInterimTranscript += transcript;
        }
      }

      // Dispatch actions to update state
      if (newFinalTranscript) {
        dispatch({ type: "ADD_FINAL", payload: newFinalTranscript });
      }
      if (newInterimTranscript) {
        dispatch({ type: "ADD_INTERIM", payload: newInterimTranscript });
      } else {
        dispatch({ type: "CLEAR_INTERIM" });
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error("Speech recognition error", event.error);
    };

    recognitionInstance.start();

    // Cleanup function
    return () => {
      recognitionInstance.stop();
    };
  }, []);

  return (
    <div id="subtitles-container">
      <h2>Meeting Transcript</h2>
      <p id="subtitles">
        {state.final} {/* Display final transcript */}
        <span style={{ color: "gray" }}>{state.interim}</span> {/* Display interim transcript in gray */}
      </p>
    </div>
  );
}

export default Subtitles;
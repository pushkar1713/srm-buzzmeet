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

  // Function to handle download or discard option
  const handleTranscriptAction = () => {
    const userChoice = window.confirm(
      "Do you want to download the transcript? Press OK to download or Cancel to discard."
    );

    if (userChoice) {
      // User chose to download the transcript
      const fullTranscript = state.final + state.interim; // Combine final and interim transcripts
      const blob = new Blob([fullTranscript], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting_transcript_${new Date().toISOString()}.txt`; // Dynamic file name
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
    } else {
      // User chose to discard the transcript
      alert("Transcript discarded. It will not be saved.");
      localStorage.removeItem("meeting_transcript"); // Clear transcript from local storage
      dispatch({ type: "CLEAR_INTERIM" }); // Clear interim transcript
      dispatch({ type: "ADD_FINAL", payload: "" }); // Clear final transcript
    }
  };

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
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
      {/* Transcript Container */}
      <div style={{ flex: 1, maxHeight: "200px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
        <p style={{ margin: 0 }}>
          {state.final} {/* Display final transcript */}
          <span style={{ color: "#888" }}>{state.interim}</span> {/* Display interim transcript in gray */}
        </p>
      </div>

      {/* Save/Discard Button */}
      <button
        onClick={handleTranscriptAction}
        style={{
          padding: "8px 16px",
          backgroundColor: "#4C7273",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save/Discard
      </button>
    </div>
  );
}

export default Subtitles;
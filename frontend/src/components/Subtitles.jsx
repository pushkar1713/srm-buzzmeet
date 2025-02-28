import React, { useReducer, useEffect, useState } from "react";

// Extended reducer function to manage transcript and summary state
const transcriptReducer = (state, action) => {
  switch (action.type) {
    case "ADD_FINAL":
      return { ...state, final: state.final + action.payload + "\n" };
    case "ADD_INTERIM":
      return { ...state, interim: action.payload };
    case "CLEAR_INTERIM":
      return { ...state, interim: "" };
    case "SET_SUMMARY":
      return { ...state, summary: action.payload };
    case "CLEAR_SUMMARY":
      return { ...state, summary: "" };
    default:
      return state;
  }
};

function Subtitles() {
  const [state, dispatch] = useReducer(transcriptReducer, {
    final: "",
    interim: "",
    summary: "",
  });

  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const GEMINI_API_KEY = "AIzaSyBrpwAvs2d5KyXmatO_j2zFDPZojqoOEI0";
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Autosave transcript to local storage whenever it changes
  useEffect(() => {
    if (state.final || state.interim) {
      const fullTranscript = state.final + state.interim;
      localStorage.setItem("meeting_transcript", fullTranscript);
    }
  }, [state.final, state.interim]);

  // Function to handle download or discard option for transcript
  const handleTranscriptAction = () => {
    const userChoice = window.confirm(
      "Do you want to download the transcript? Press OK to download or Cancel to discard."
    );

    if (userChoice) {
      const fullTranscript = state.final + state.interim;
      const blob = new Blob([fullTranscript], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting_transcript_${new Date().toISOString()}.txt`;
      a.click();

      URL.revokeObjectURL(url);
    } else {
      alert("Transcript discarded. It will not be saved.");
      localStorage.removeItem("meeting_transcript");
      dispatch({ type: "CLEAR_INTERIM" });
      dispatch({ type: "ADD_FINAL", payload: "" });
    }
  };

  // Function to handle file upload and generate summary
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      alert("Please upload a text (.txt) file");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);

    try {
      const text = await readFileAsText(file);
      const summary = await generateSummaryWithGemini(text);
      dispatch({ type: "SET_SUMMARY", payload: summary });
    } catch (error) {
      console.error("Error processing file:", error);
      alert(`Error processing file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to read file content as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Function to generate summary using Gemini API
  const generateSummaryWithGemini = async (text) => {
    try {
      const truncatedText = text.length > 25000 ? text.substring(0, 25000) + "..." : text;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please provide a comprehensive summary of the following text. Include the main themes, key points, and important details. Format the summary in a clear, structured way:
                  
${truncatedText}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("No summary was generated");
      }

      return generatedText;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  };

  // Function to download the summary
  const downloadSummary = () => {
    if (!state.summary) {
      alert("No summary available to download.");
      return;
    }

    const blob = new Blob([state.summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `summary_${fileName.replace(/\.[^/.]+$/, "")}_${new Date().toISOString()}.txt`;
    a.click();

    URL.revokeObjectURL(url);
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
          newFinalTranscript += transcript + " ";
        } else {
          newInterimTranscript += transcript;
        }
      }

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

    return () => {
      recognitionInstance.stop();
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
        color: "#041421",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      {/* Transcript Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* Download Transcript Button */}
          <button
            onClick={handleTranscriptAction}
            style={{
              padding: "10px 16px",
              backgroundColor: "#4C7273",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              letterSpacing: "0.3px",
              transition: "background-color 0.2s ease",
              boxShadow: "0 2px 4px rgba(76, 114, 115, 0.2)",
              ":hover": {
                backgroundColor: "#3a5a5b",
              },
            }}
          >
            Download Transcript
          </button>

          {/* Upload Text File Button */}
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            id="file-upload"
            style={{ display: "none" }}
          />
          <label
            htmlFor="file-upload"
            style={{
              padding: "10px 16px",
              backgroundColor: "#4C7273",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              letterSpacing: "0.3px",
              transition: "background-color 0.2s ease",
              boxShadow: "0 2px 4px rgba(76, 114, 115, 0.2)",
              ":hover": {
                backgroundColor: "#3a5a5b",
              },
            }}
          >
            Upload Text File
          </label>

          {/* File Name Display */}
          {fileName && (
            <span
              style={{
                marginLeft: "10px",
                fontSize: "14px",
                color: "#555",
                fontStyle: "italic",
              }}
            >
              {isLoading ? "Generating summary..." : `File: ${fileName}`}
            </span>
          )}
        </div>

        {/* Transcript Display */}
        <div
          style={{
            border: "1px solid #e0e5e6",
            borderRadius: "6px",
            padding: "12px",
            backgroundColor: "#f8f9fa",
            boxShadow: "0 1px 3px rgba(4, 20, 33, 0.08)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.5",
              letterSpacing: "0.01em",
            }}
          >
            {state.final}
            <span style={{ color: "#6c757d", fontStyle: "italic" }}>
              {state.interim}
            </span>
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* Download Summary Button */}
          {state.summary && (
            <button
              onClick={downloadSummary}
              style={{
                padding: "10px 16px",
                backgroundColor: "#4C7273",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "14px",
                letterSpacing: "0.3px",
                transition: "background-color 0.2s ease",
                boxShadow: "0 2px 4px rgba(76, 114, 115, 0.2)",
                ":hover": {
                  backgroundColor: "#3a5a5b",
                },
              }}
            >
              Download Summary
            </button>
          )}
        </div>

        {/* Summary Display */}
        {state.summary && (
          <div
            style={{
              border: "1px solid #e0e5e6",
              borderRadius: "6px",
              padding: "16px",
              maxHeight: "200px",
              overflowY: "auto",
              backgroundColor: "#f8f9fa",
              boxShadow: "0 1px 3px rgba(4, 20, 33, 0.08)",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "17px",
                fontWeight: "600",
                color: "#4C7273",
                borderBottom: "1px solid #e0e5e6",
                paddingBottom: "8px",
                letterSpacing: "0.02em",
              }}
            >
              Text Summary
            </h3>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: "15px",
                lineHeight: "1.5",
                letterSpacing: "0.01em",
              }}
            >
              {state.summary}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subtitles;
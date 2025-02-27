import React from "react";
import "./CodeEditor.css";

const CodeEditor = ({ code, onChange }) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="code-editor">
      <h3>Code Editor</h3>
      <textarea
        value={code}
        onChange={handleChange}
        placeholder="Write your JavaScript code here..."
        className="code-textarea"
      />
    </div>
  );
};

export default CodeEditor;

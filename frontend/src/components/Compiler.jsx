import React, { useState } from "react";
import "./Compiler.css";

const Compiler = ({ code, onCompile }) => {
  const [compileResult, setCompileResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleCompile = async () => {
    if (!code.trim()) {
      setCompileResult("No code to compile");
      setIsError(true);
      return;
    }

    setIsCompiling(true);
    setCompileResult(null);

    try {
      const result = await onCompile();
      setIsCompiling(false);

      if (result && result.error) {
        setCompileResult(result.error);
        setIsError(true);
      } else {
        setCompileResult(result || "Compilation successful");
        setIsError(false);
      }
    } catch (error) {
      setIsCompiling(false);
      setCompileResult(error.message || "An error occurred during compilation");
      setIsError(true);
    }
  };

  return (
    <div className="compiler">
      <div className="compiler-controls">
        <h3>Compiler</h3>
        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="compile-button"
        >
          {isCompiling ? "Compiling..." : "Compile Code"}
        </button>
      </div>

      {compileResult && (
        <div className={`compiler-result ${isError ? "error" : "success"}`}>
          <h4>{isError ? "Error" : "Result"}</h4>
          <pre>{compileResult}</pre>
        </div>
      )}
    </div>
  );
};

export default Compiler;

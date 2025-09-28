import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";

// Check for development mode to conditionally enable StrictMode
// Use ?strict=false in URL to disable StrictMode for testing
const urlParams = new URLSearchParams(window.location.search);
const enableStrictMode = urlParams.get("strict") !== "false";

const root = ReactDOM.createRoot(document.getElementById("root"));

if (enableStrictMode) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // Version without StrictMode for testing WebSocket stability
  root.render(<App />);
}

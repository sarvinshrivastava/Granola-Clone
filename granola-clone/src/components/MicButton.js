/**
 * @fileoverview Microphone recording button component
 * @description Interactive button for controlling audio recording with visual state feedback
 */

import React, { useState } from "react";

/**
 * @component MicButton
 * @description Toggle button for microphone activation with visual state feedback
 * @returns {JSX.Element} Rendered microphone button
 */
function MicButton() {
  const [active, setActive] = useState(false);

  return (
    <button
      onClick={() => setActive(!active)}
      className={active ? "mic-btn active" : "mic-btn"}
    >
      {active ? "🎤 Recording..." : "🎤 Start Mic"}
    </button>
  );
}

export default MicButton;

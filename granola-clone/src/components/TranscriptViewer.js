import React from "react";

/**
 * @fileoverview Transcript viewer component for displaying real-time transcriptions
 * @description Handles display of live transcription text with proper formatting
 */

import React from "react";

/**
 * @component TranscriptViewer
 * @description Component for displaying real-time transcript text
 * @param {Object} props - Component props
 * @param {string} props.transcript - Current transcript text to display
 * @returns {JSX.Element} Rendered transcript viewer
 */
const TranscriptViewer = ({ transcript }) => {
  return (
    <div className="transcript-viewer">
      <p>{content}</p>
    </div>
  );
};

export default TranscriptViewer;

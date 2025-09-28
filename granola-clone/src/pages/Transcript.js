/**
 * @fileoverview Transcript page component for viewing individual meeting transcripts
 * @description Displays detailed transcript content for specific meetings
 */

import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import { TranscriptContext } from "../context/TranscriptContext";

/**
 * @component Transcript
 * @description Page component for displaying individual meeting transcripts
 * @returns {JSX.Element} Rendered transcript page with meeting details
 */
function Transcript() {
  const { id } = useParams();
  const { transcripts } = useContext(TranscriptContext);

  const transcript = transcripts.find((t) => t.id.toString() === id);

  if (!transcript) return <p>Transcript not found</p>;

  return (
    <div className="container">
      <h2>{transcript.title}</h2>
      <p>
        <b>Date:</b> {transcript.date}
      </p>
      <p>{transcript.content}</p>
    </div>
  );
}

export default Transcript;

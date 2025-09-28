/**
 * @fileoverview Meeting card component for displaying meeting information
 * @description Reusable card component for meeting list display with navigation
 */

import React from "react";
import { Link } from "react-router-dom";

/**
 * @component MeetingCard
 * @description Card component displaying meeting details with link to transcript
 * @param {Object} props - Component props
 * @param {Object} props.meeting - Meeting data object
 * @param {number} props.meeting.id - Unique meeting identifier
 * @param {string} props.meeting.title - Meeting title
 * @param {string} props.meeting.date - Meeting date
 * @param {string} props.meeting.content - Meeting content/description
 * @returns {JSX.Element} Rendered meeting card
 */
const MeetingCard = ({ meeting }) => {
  return (
    <div className="card">
      <h3>{meeting.title}</h3>
      <p>{meeting.date}</p>
      <Link to={`/transcript/${meeting.id}`}>View Transcript</Link>
    </div>
  );
};

export default MeetingCard;

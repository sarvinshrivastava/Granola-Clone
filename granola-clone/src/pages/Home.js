/**
 * @fileoverview Home page component displaying meeting list
 * @description Main dashboard showing available meetings and transcripts
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { transcripts } from "../__mocks__/mockData";
import MeetingCard from "../components/MeetingCard";

/**
 * @component Home
 * @description Homepage displaying list of available meetings
 * @returns {JSX.Element} Rendered home page with meeting cards
 */
const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h2>Saved Meetings</h2>
      {transcripts.map((t) => (
        <MeetingCard key={t.id} meeting={t} />
      ))}
      <button onClick={() => navigate("/live")} className="start-btn">
        Start Meeting
      </button>
    </div>
  );
};

export default Home;

/**
 * @fileoverview Main Application Component
 * @description Root component that sets up routing, global state management,
 * and application structure for the Granola Clone Hindi STT application.
 *
 * Features:
 * - React Router for navigation
 * - Global transcript state management
 * - Clean component hierarchy
 * - Error boundary ready structure
 *
 * @author AI Assistant
 * @version 2.0.0
 * @since 2025-09-27
 */

// =============================================================================
// IMPORTS
// =============================================================================

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Global Context Providers
import { TranscriptProvider } from "./context/TranscriptContext";

// Layout Components
import Navbar from "./components/Navbar";

// Page Components
import Home from "./pages/Home";
import LiveMeeting from "./pages/LiveMeeting";
import Transcript from "./pages/Transcript";

// =============================================================================
// MAIN APPLICATION COMPONENT
// =============================================================================

/**
 * @component App
 * @description Main application component with routing and global state
 * @returns {JSX.Element} The main application structure
 */
function App() {
  return (
    <TranscriptProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<LiveMeeting />} />
              <Route path="/transcript/:id" element={<Transcript />} />
            </Routes>
          </main>
        </div>
      </Router>
    </TranscriptProvider>
  );
}

export default App;

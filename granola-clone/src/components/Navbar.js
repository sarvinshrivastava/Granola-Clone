/**
 * @fileoverview Navigation bar component for the Granola Clone application
 * @description Provides consistent navigation across all pages with responsive design
 */

import React from "react";
import { Link } from "react-router-dom";

/**
 * @component Navbar
 * @description Main navigation component with brand logo and navigation links
 * @returns {JSX.Element} Rendered navigation bar
 */
const Navbar = () => {
  return (
    <nav className="navbar">
      <h1>Granola Clone</h1>
      <div>
        <Link to="/">Home</Link>
      </div>
    </nav>
  );
};

export default Navbar;

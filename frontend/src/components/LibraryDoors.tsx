import React from 'react';
import './LibraryDoors.css';
import { Book } from 'lucide-react';
import { Link } from 'react-router-dom';

function LibraryDoors() {
  return (
    <div className="library-container">
      <div className="door-content">
        <h1 className="door-title">Where Imagination Lives</h1>
        <p className="door-subtitle">Bring stories to life with AI-powered narration and magical illustrations.</p>
        <Link to="/generate" className="cta-button">
          Get Started <Book size={18} />
        </Link>
      </div>
    </div>
  );
}

export default LibraryDoors;

import React from 'react';
import './TitleContainer.css';
import { Book } from 'lucide-react';
import { Link } from 'react-router-dom';

function TitleContainer() {
  return (
    <div className="container">
      <div className="content">
        <h1 className="title">Where Imagination Lives</h1>
        <p className="subtitle">Bring stories to life with AI-powered narration and magical illustrations.</p>
        <Link to="/generate" className="cta-button">
          Get Started <Book size={18} />
        </Link>
      </div>
    </div>
  );
}

export default TitleContainer;

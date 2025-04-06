import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import './App.css';
import { Book, Star, Users, Info, Volume2 } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<StoryGenerator />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo" />
      <h1 className="title">Story Buddy</h1>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/generate">Create Story</Link>
        <Link to="/testimonials">Testimonials</Link>
        <Link to="/about">About Us</Link>
      </div>
    </nav>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Story Buddy</h1>
        <p>Magical Stories for Curious Minds</p>
        <Link to="/generate" className="cta-button">
          Start Your Adventure <Book />
        </Link>
      </div>
      <div className="features-section">
        <Feature icon={<Star />} title="Magical Genres" description="Choose from multiple exciting story genres" />
        <Feature icon={<Book />} title="Interactive Stories" description="Engaging chapters with beautiful illustrations" />
        <Feature icon={<Users />} title="Kid-Friendly" description="Safe and educational storytelling" />
      </div>
    </div>
  );
}

function Feature({ icon, title, description }) {
  return (
    <div className="feature">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function StoryGenerator() {
  const [genreInput, setGenreInput] = useState('');
  const [generatedStory, setGeneratedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chapterCount, setChapterCount] = useState(3);
  const [hfToken, setHfToken] = useState('');

  const fetchStory = async () => {
    if (!genreInput.trim()) {
      alert("Please enter a genre or theme!");
      return;
    }

    if (!hfToken.startsWith("hf_")) {
      alert("Please enter a valid Hugging Face token (starting with 'hf_')");
      return;
    }

    setLoading(true);
try {
  const BASE_URL = "https://storybuddy-backend-517552572292.asia-south1.run.app";

  const response = await fetch(
    `${BASE_URL}/generate?genre=${encodeURIComponent(genreInput)}&chapters=${chapterCount}&token=${hfToken}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch story from backend.");
  }

  // continue with your logic...


      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const formattedStory = {
        title: `A "${genreInput}" Story`,
        chapters: data.map((item) => ({
          title: item.chapter,
          content: item.content,
          image: `data:image/png;base64,${item.imageBase64}`
        })),
        moral: "Every story has a lesson to learn."
      };

      setGeneratedStory(formattedStory);
    } catch (err) {
      alert("Error generating story: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (generatedStory) {
      const fullStory = generatedStory.chapters.map(chap => chap.content).join(' ');
      const utterance = new SpeechSynthesisUtterance(fullStory);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="story-generator">
      <h2>Create Your Story</h2>
      <div className="genre-input-section">
        <input
          type="password"
          placeholder="Enter Hugging Face Token (starts with hf_)"
          value={hfToken}
          onChange={(e) => setHfToken(e.target.value)}
          className="genre-input"
        />
        <input
          type="text"
          placeholder="Type a genre or theme (e.g., friendship, space adventure...)"
          value={genreInput}
          onChange={(e) => setGenreInput(e.target.value)}
          className="genre-input"
        />
        
        <div className="chapter-count-section">
          <label htmlFor="chapterCount">Select number of chapters: {chapterCount}</label>
          <input
            type="range"
            id="chapterCount"
            min="1"
            max="10"
            value={chapterCount}
            onChange={(e) => setChapterCount(Number(e.target.value))}
          />
        </div>

        <button onClick={fetchStory} disabled={loading}>
          {loading ? "Generating..." : "Generate Story"}
        </button>
      </div>

      {generatedStory && (
        <div className="generated-story">
          <div className="story-header">
            <h3>{generatedStory.title}</h3>
            <button className="audio-btn" onClick={playAudio}>
              <Volume2 /> Listen to Story
            </button>
          </div>
          <div className="story-chapters">
            {generatedStory.chapters.map((chapter, index) => (
              <div key={index} className="story-chapter">
                <div className="chapter-image-container">
                  <img src={chapter.image} alt={`Chapter ${index + 1}`} className="chapter-image" />
                  <div className="chapter-number">{index + 1}</div>
                </div>
                <div className="chapter-content">
                  <h4>{chapter.title}</h4>
                  <p>{chapter.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="story-moral">
            <h4>Moral of the Story</h4>
            <p>{generatedStory.moral}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: "Emily, 8",
      text: "I love creating stories with Story Buddy! It's so much fun!",
      image: "/api/placeholder/80/80"
    },
    {
      name: "Michael, Parent",
      text: "Great educational tool for my kids' imagination!",
      image: "/api/placeholder/80/80"
    }
  ];

  return (
    <div className="testimonials">
      <h2>What Our Users Say</h2>
      <div className="testimonial-grid">
        {testimonials.map((t, index) => (
          <div key={index} className="testimonial-card">
            <img src={t.image} alt={t.name} />
            <p>"{t.text}"</p>
            <h4>- {t.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutUs() {
  return (
    <div className="about-us">
      <h2>About Story Buddy</h2>
      <p className="mission">
        
          StoryBuddy is your little one’s storytelling companion — designed to spark imagination, creativity, and joy! Whether it’s bedtime or playtime, StoryBuddy lets kids explore magical tales across different genres, complete with vivid images that bring every story to life.

          We believe stories are powerful. They teach, inspire, and create beautiful memories. That’s why we built StoryBuddy — a fun, easy-to-use web app where kids (and parents!) can choose a genre and enjoy personalized stories anytime, anywhere.

          At StoryBuddy, our mission is simple:
          Make storytelling magical and accessible for every child.

          
      </p>
      <h3>Our Team</h3>
      <div className="team-members">
        <TeamMember name="Sarah Johnson" role="Founder & Storyteller" />
        <TeamMember name="Alex Rodriguez" role="Creative Director" />
      </div>
    </div>
  );
}

function TeamMember({ name, role }) {
  return (
    <div className="team-member">
      <img src="/api/placeholder/100/100" alt={name} />
      <h4>{name}</h4>
      <p>{role}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>© 2025 Story Buddy. All Rights Reserved.</p>
        <div className="social-links">{/* Social icons can be added here */}</div>
      </div>
    </footer>
  );
}

export default App;

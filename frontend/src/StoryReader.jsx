import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Volume2, ArrowLeft } from 'lucide-react';

function StoryReader() {
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story; 
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!story) {
      navigate('/library');
    }
  }, [story, navigate]);

  if (!story) return null;

  const toggleAudio = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const fullText = story.chapters.map(c => c.content).join(' ');
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="reader-container" style={{ padding: '40px', color: 'white', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header with Back Button */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/library')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ArrowLeft size={20} /> Back to Library
        </button>
        <button className={`audio-btn ${isSpeaking ? 'playing' : ''}`} onClick={toggleAudio}>
          <Volume2 size={20} /> {isSpeaking ? "Pause" : "Read Aloud"}
        </button>
      </div>

      <div className="story-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{story.title}</h1>
        <p style={{ fontStyle: 'italic', opacity: 0.8 }}>Created on {new Date(story.created_at).toLocaleDateString()}</p>
      </div>

      <div className="story-chapters">
        {story.chapters.map((chapter, index) => (
          <div key={index} className="story-chapter" style={{ marginBottom: '60px', background: '#2a2a2a', padding: '30px', borderRadius: '15px' }}>
            <h2 style={{ color: '#4facfe', marginBottom: '20px' }}>Chapter {index + 1}: {chapter.title}</h2>
            
            <div className="chapter-image-container" style={{ marginBottom: '25px' }}>
              <img 
                src={chapter.image} 
                alt="chapter" 
                style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} 
              />
            </div>
            
            <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#e0e0e0' }}>{chapter.content}</p>
          </div>
        ))}
      </div>

      <div className="story-moral" style={{ background: '#4facfe20', padding: '20px', borderRadius: '10px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ color: '#4facfe', margin: '0 0 10px 0' }}>🌟 Moral of the Story</h3>
        <p style={{ fontSize: '1.1rem' }}>{story.moral}</p>
      </div>

    </div>
  );
}

export default StoryReader;
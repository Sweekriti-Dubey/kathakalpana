import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Volume2, ArrowLeft, Sparkles } from 'lucide-react';

// 🟢 Re-using the same fixed loader for the Reader
const ChapterImageLoader = ({ image_prompt, image_seed }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const getImageUrl = (prompt, seed) => {
        const fullPrompt = `${prompt}, cute digital art style for children's book`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=512&seed=${seed || 1234}&nologo=true&model=flux-schnell`;
    };
    return (
        <div style={{ width: '100%', minHeight: '300px', background: '#1a1a1a', borderRadius: '15px', overflow: 'hidden', marginBottom: '20px' }}>
            <img 
                src={getImageUrl(image_prompt, image_seed)} 
                alt="Story Illustration"
                style={{ width: '100%', display: 'block', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
                onLoad={() => setImageLoaded(true)}
            />
        </div>
    );
};

function StoryReader() {
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story; 
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!story) navigate('/library');
  }, [story, navigate]);

  if (!story) return null;

  const toggleAudio = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const fullText = story.chapters.map(c => `${c.title}. ${c.content}`).join(' ');
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="reader-container" style={{ padding: '40px 20px', color: 'white', maxWidth: '900px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/library')} style={{ background: 'none', border: 'none', color: '#4facfe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
          <ArrowLeft size={20} /> Back to Library
        </button>
        <button className={`audio-btn ${isSpeaking ? 'playing' : ''}`} onClick={toggleAudio} style={{ padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={20} /> {isSpeaking ? "Stop Reading" : "Read Aloud"}
        </button>
      </div>

      <div className="story-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px', background: 'linear-gradient(to right, #4facfe, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {story.title}
        </h1>
        <p style={{ opacity: 0.6 }}>Captured in your library on {new Date(story.created_at).toLocaleDateString()}</p>
      </div>

      <div className="story-chapters">
        {story.chapters.map((chapter, index) => (
          <div key={index} className="story-chapter" style={{ marginBottom: '80px' }}>
            {/* 🟢 IMAGES NOW SHOW IN THE READER TOO */}
            <ChapterImageLoader image_prompt={chapter.image_prompt} image_seed={chapter.image_seed} />
            
            <div className="chapter-text-box" style={{ padding: '0 20px' }}>
                <h2 style={{ color: '#4facfe', fontSize: '1.8rem', marginBottom: '15px' }}>
                    {index + 1}. {chapter.title}
                </h2>
                <p style={{ fontSize: '1.3rem', lineHeight: '1.8', color: '#f0f0f0', letterSpacing: '0.3px' }}>
                    {chapter.content}
                </p>
            </div>
          </div>
        ))}
      </div>

      <div className="story-moral" style={{ background: 'rgba(79, 172, 254, 0.1)', border: '1px solid #4facfe', padding: '30px', borderRadius: '20px', textAlign: 'center', marginTop: '60px' }}>
        <h3 style={{ color: '#4facfe', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Sparkles size={24} /> The Lesson Learned
        </h3>
        <p style={{ fontSize: '1.2rem', fontStyle: 'italic' }}>{story.moral}</p>
      </div>
    </div>
  );
}

export default StoryReader;
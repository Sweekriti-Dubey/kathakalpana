import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { Book, Star, Users, Volume2, LogOut, Save, Sparkles, RefreshCcw } from 'lucide-react';
import Login from './Login';
import Library from './Library'; 
import StoryReader from './StoryReader';

// --- CHAPTER IMAGE LOADER ---
// This component handles individual image states and timeouts.
const ChapterImageLoader = ({ image_prompt, image_seed, isAllowedToLoad, onFinished }) => {
    const [status, setStatus] = useState('waiting'); // waiting, painting, success, error
    const [retries, setRetries] = useState(0);
    const timeoutRef = useRef(null);

    const getImageUrl = (prompt, seed) => {
        if (!prompt) return "https://loremflickr.com/768/512/cartoon";
        // Simplify prompt drastically to avoid 524 timeouts
        const cleanPrompt = prompt.split(',')[0].split(' ').slice(0, 7).join(' ');
        const styledPrompt = encodeURIComponent(`${cleanPrompt}, children's book illustration`);
        return `https://image.pollinations.ai/prompt/${styledPrompt}?width=768&height=512&seed=${seed || 1234}&nologo=true&model=flux-schnell&retry=${retries}`;
    };

    useEffect(() => {
        if (isAllowedToLoad && status === 'waiting') {
            setStatus('painting');
            
            // 40-second timeout to catch 524 errors that don't trigger onError
            timeoutRef.current = setTimeout(() => {
                if (status !== 'success') setStatus('error');
            }, 40000);
        }
        return () => clearTimeout(timeoutRef.current);
    }, [isAllowedToLoad, status]);

    const handleLoad = () => {
        clearTimeout(timeoutRef.current);
        setStatus('success');
        // Signal parent that this slot is done (allow next image after cooldown)
        onFinished();
    };

    const handleError = () => {
        setStatus('error');
        onFinished(); // Still signal finished so queue doesn't get stuck
    };

    return (
        <div className="chapter-image-container" style={{ 
            width: '100%', minHeight: '350px', backgroundColor: '#1a1a1a', 
            borderRadius: '15px', overflow: 'hidden', position: 'relative', marginBottom: '25px',
            border: status === 'painting' ? '2px solid #4facfe' : '2px solid transparent'
        }}>
            {status === 'waiting' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    Waiting in queue... ⏳
                </div>
            )}
            
            {status === 'painting' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4facfe', background: '#111' }}>
                    <div className="spinner">🎨</div>
                    <span style={{ marginTop: '10px' }}>Painting Chapter...</span>
                </div>
            )}

            {status === 'error' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff4b2b', background: 'rgba(0,0,0,0.8)' }}>
                    <span style={{ marginBottom: '10px' }}>Server busy or timed out 🐢</span>
                    <button 
                        onClick={() => { setRetries(r => r + 1); setStatus('painting'); }}
                        style={{ padding: '8px 20px', backgroundColor: '#4facfe', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}
                    >
                        <RefreshCcw size={16} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Retry
                    </button>
                </div>
            )}

            <img 
                src={getImageUrl(image_prompt, image_seed)}
                alt="Illustration"
                style={{ 
                    width: '100%', 
                    display: 'block',
                    opacity: status === 'success' ? 1 : 0, 
                    transition: 'opacity 0.8s ease-in-out'
                }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
};

// --- STORY GENERATOR ---
function StoryGenerator({ token }) {
    const [genreInput, setGenreInput] = useState('');
    const [generatedStory, setGeneratedStory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [chapterCount, setChapterCount] = useState(3);
    const [currentImageIndex, setCurrentImageIndex] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const navigate = useNavigate();

    const fetchStory = async () => {
        if (!genreInput.trim()) return alert("Please enter a genre!");
        setLoading(true);
        setGeneratedStory(null);
        setCurrentImageIndex(-1);
        window.speechSynthesis.cancel();
        setIsSpeaking(false);

        try {
            const response = await axios.post("https://kathakalpana-api.onrender.com/generate", 
                { genre: genreInput, chapters: parseInt(chapterCount) },
                { headers: { Authorization: `Bearer ${token}` } } 
            );
            setGeneratedStory(response.data);
            // Wait 2 seconds for text to render before starting first image
            setTimeout(() => setCurrentImageIndex(0), 2000);
        } catch (err) {
            console.error(err);
            alert("Failed to generate story.");
        } finally {
            setLoading(false);
        }
    };

    // 🟢 Fix: Sequential Queue logic with Cooldown
    const handleImageFinished = useCallback(() => {
        // Wait 12 seconds before starting next image to satisfy Pollinations rate limit
        setTimeout(() => {
            setCurrentImageIndex(prev => prev + 1);
        }, 12000); 
    }, []);

    const saveStoryToLibrary = async () => {
        if (!generatedStory) return;
        setSaving(true);
        try {
            await axios.post("https://kathakalpana-api.onrender.com/save_story", 
                generatedStory, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Saved! 📚");
            navigate('/library'); 
        } catch (error) {
            alert("Save failed.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAudio = () => {
        if (!generatedStory) return;
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const fullText = generatedStory.chapters.map(c => c.content).join(' ');
            const utterance = new SpeechSynthesisUtterance(fullText);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    return (
        <div className="story-generator">
            <h2>Create Your Magic Story ✨</h2>
            <div className="genre-input-section">
                <input
                    type="text"
                    placeholder="Enter a topic (e.g., Space Adventure)..."
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    className="genre-input"
                />
                <button onClick={fetchStory} disabled={loading}>
                    {loading ? "Dreaming..." : "Generate Story 🚀"}
                </button>
            </div>

            {generatedStory && (
                <div className="generated-story">
                    <div className="story-header">
                        <h3>{generatedStory.title}</h3>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button className="audio-btn" onClick={toggleAudio}>
                                {isSpeaking ? "Pause" : "Listen"}
                            </button>
                            <button className="audio-btn" onClick={saveStoryToLibrary} disabled={saving} style={{background: '#28a745'}}>
                                {saving ? "Saving..." : "Save to Library"}
                            </button>
                        </div>
                    </div>
                    
                    <div className="story-chapters">
                        {generatedStory.chapters.map((chapter, index) => (
                            <div key={index} className="story-chapter">
                                <ChapterImageLoader 
                                    image_prompt={chapter.image_prompt} 
                                    image_seed={chapter.image_seed} 
                                    isAllowedToLoad={index <= currentImageIndex}
                                    onFinished={handleImageFinished}
                                />
                                <div className="chapter-content">
                                    <h4>{chapter.title}</h4>
                                    <p>{chapter.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- NAVIGATION & PAGES ---
function Navbar({ isLoggedIn, onLogout }) {
    return (
        <nav className="navbar">
            <h1 className="title">Katha Kalpana</h1>
            <div className="nav-links">
                <Link to="/">Home</Link>
                {isLoggedIn && <Link to="/generate">Create</Link>}
                {isLoggedIn && <Link to="/library">Library</Link>}
                <Link to="/about">About</Link>
                {isLoggedIn ? (
                    <button onClick={onLogout} className="nav-btn">Log Out</button>
                ) : (
                    <Link to="/login" className="nav-cta">Login</Link>
                )}
            </div>
        </nav>
    );
}

function HomePage() {
    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Where Imagination Lives</h1>
                <p>Create AI-powered stories with magical illustrations.</p>
                <Link to="/generate" className="cta-button">Get Started <Book /></Link>
            </div>
        </div>
    );
}

function AboutUs() {
    return <div className="about-us"><h2>About Us</h2><p>AI storytelling for kids.</p></div>;
}

function Footer() {
    return <footer className="app-footer"><p>© 2025 Katha Kalpana</p></footer>;
}

// --- MAIN APP ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));

    const handleLogin = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const ProtectedRoute = ({ children }) => {
        if (!token) return <Navigate to="/login" replace />;
        return children;
    };

    return (
        <Router>
            <div className="app-container">
                <Navbar isLoggedIn={!!token} onLogout={handleLogout} />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="/generate" element={<ProtectedRoute><StoryGenerator token={token} /></ProtectedRoute>} />
                    <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                    <Route path="/read" element={<ProtectedRoute><StoryReader /></ProtectedRoute>} />
                    <Route path="/about" element={<AboutUs />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
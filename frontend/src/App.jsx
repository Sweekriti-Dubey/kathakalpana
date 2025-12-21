import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { Book, Star, Users, Volume2, LogOut, Save } from 'lucide-react';
import Login from './Login';
import Library from './Library'; 
import StoryReader from './StoryReader';

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
                    <Route path="/testimonials" element={<Testimonials />} />
                    <Route path="/about" element={<AboutUs />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
}

function Navbar({ isLoggedIn, onLogout }) {
    return (
        <nav className="navbar">
            <div className="logo" />
            <h1 className="title">Katha Kalpana</h1>
            <div className="nav-links">
                <Link to="/">Home</Link>
                {isLoggedIn && <Link to="/generate">Create</Link>}
                {isLoggedIn && <Link to="/library">My Library</Link>}
                <Link to="/testimonials">Testimonials</Link>
                {isLoggedIn ? (
                    <button onClick={onLogout} className="nav-btn" style={{background:'none', border:'none', color:'white', cursor:'pointer', marginLeft: '20px'}}>
                         Log Out <LogOut size={16} style={{marginBottom: '-3px'}}/>
                    </button>
                ) : (
                    <Link to="/login" className="nav-cta" style={{background: '#4facfe', padding: '8px 15px', borderRadius: '20px', marginLeft: '15px'}}>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}


const ChapterImageLoader = ({ image_prompt, image_seed }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [retries, setRetries] = useState(0);

    // Manual 30-second timeout to catch proxy timeouts that onError misses
    useEffect(() => {
        if (!imageLoaded && !imageError) {
            const timer = setTimeout(() => {
                console.log("⏰ 30-second timeout reached - forcing error state");
                setImageError(true); 
            }, 30000);
            return () => clearTimeout(timer);
        }
    }, [imageLoaded, imageError, retries]);

    const getImageUrl = (prompt, seed) => {
        if (!prompt) return "https://loremflickr.com/768/512/cartoon";
        
        // Simplify prompt: take first 10 words and remove special characters
        const words = prompt.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        const simplifiedPrompt = words.slice(0, 10).join(' ');
        const styledPrompt = `${simplifiedPrompt}, simple illustration`;
        
        // Use flux-schnell model with retry parameter
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=768&height=512&seed=${seed || 1234}&nologo=true&model=flux-schnell&retry=${retries}`;
    };

    const handleRetry = () => {
        console.log("🔄 Retry button clicked - resetting all states");
        setImageError(false);
        setImageLoaded(false);
        setRetries(r => r + 1);
    };

    return (
        <div className="chapter-image-container" style={{ 
            width: '100%', minHeight: '300px', backgroundColor: '#1a1a1a', 
            borderRadius: '15px', overflow: 'hidden', position: 'relative', marginBottom: '20px' 
        }}>
            {/* Loading State */}
            {!imageLoaded && !imageError && (
                <div style={{ 
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: '#4facfe', zIndex: 2 
                }}>
                    <div style={{ fontSize: '18px', marginBottom: '10px' }}>Generating Magic ✨</div>
                    <div style={{ fontSize: '14px', color: '#888' }}>This may take up to 30 seconds...</div>
                </div>
            )}

            {/* Error State with Prominent Retry Button */}
            {imageError && (
                <div style={{ 
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                    alignItems: 'center', justifyContent: 'center', 
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
                    zIndex: 3, padding: '20px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏱️</div>
                    <span style={{ 
                        fontSize: '18px', color: '#ff6b6b', marginBottom: '10px', fontWeight: '600',
                        textAlign: 'center'
                    }}>
                        Generation took too long
                    </span>
                    <span style={{ fontSize: '14px', color: '#aaa', marginBottom: '20px', textAlign: 'center' }}>
                        The AI is under heavy load. Try again for a faster result!
                    </span>
                    <button 
                        onClick={handleRetry}
                        style={{ 
                            padding: '15px 35px', 
                            backgroundColor: '#4facfe', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '25px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)',
                            transition: 'all 0.3s ease',
                            transform: 'scale(1)'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        🔄 Retry Generation
                    </button>
                </div>
            )}

            {/* The Image */}
            <img 
                src={getImageUrl(image_prompt, image_seed)}
                alt="Chapter Illustration"
                style={{ 
                    width: '100%', 
                    display: 'block', 
                    opacity: imageLoaded ? 1 : 0, 
                    transition: 'opacity 0.5s ease-in-out' 
                }}
                onLoad={() => {
                    console.log("✅ Image loaded successfully");
                    setImageLoaded(true);
                    setImageError(false);
                }}
                onError={() => {
                    console.log("❌ Image onError triggered");
                    setImageError(true);
                }}
            />
        </div>
    );
};


function StoryGenerator({ token }) {
    const [genreInput, setGenreInput] = useState('');
    const [generatedStory, setGeneratedStory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false); 
    const [chapterCount, setChapterCount] = useState(3);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const navigate = useNavigate();

    const fetchStory = async () => {
        if (!genreInput.trim()) return alert("Please enter a genre!");
        console.log("🚀 Starting story generation for genre:", genreInput);
        setLoading(true);
        setGeneratedStory(null);
        window.speechSynthesis.cancel();
        setIsSpeaking(false);

        try {
            console.log("📡 Sending request to backend...");
            const response = await axios.post("https://kathakalpana-api.onrender.com/generate", 
                { genre: genreInput, chapters: parseInt(chapterCount) },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 } 
            );
            console.log("✅ Story data received:", response.data);
            setGeneratedStory(response.data);
        } catch (err) {
            console.error("❌ Story generation failed:", err);
            console.error("Error details:", err.response?.data || err.message);
            alert("Failed to generate story. Please try again.");
        } finally {
            setLoading(false);
            console.log("🏁 Story generation process completed");
        }
    };

    const saveStoryToLibrary = async () => {
        if (!generatedStory) return;
        setSaving(true);
        try {
            await axios.post("https://kathakalpana-api.onrender.com/save_story", 
                generatedStory, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Story saved to your library! 📚");
            navigate('/library'); 
        } catch (error) {
            console.error("Save failed:", error);
            alert("Could not save story.");
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
            utterance.rate = 0.9; 
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
                    placeholder="What is your story about? (e.g. A flying cat...)"
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    className="genre-input"
                />
                <div className="chapter-count-section">
                    <label>Story Length: {chapterCount} Chapters</label>
                    <input type="range" min="1" max="5" value={chapterCount} onChange={(e) => setChapterCount(Number(e.target.value))} />
                </div>
                <button onClick={fetchStory} disabled={loading}>
                    {loading ? "✨ Dreaming up a story..." : "Generate Story 🚀"}
                </button>
            </div>

            {generatedStory && (
                <div className="generated-story">
                    <div className="story-header">
                        <h3>{generatedStory.title}</h3>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button className={`audio-btn ${isSpeaking ? 'playing' : ''}`} onClick={toggleAudio}>
                                {isSpeaking ? <Users /> : <Volume2 />} 
                                {isSpeaking ? "Pause" : "Listen"}
                            </button>
                            <button className="audio-btn" onClick={saveStoryToLibrary} disabled={saving} style={{background: '#28a745'}}>
                                <Save size={18} /> {saving ? "Saving..." : "Save to Library"}
                            </button>
                        </div>
                    </div>
                    
                    <div className="story-chapters">
                        {generatedStory.chapters.map((chapter, index) => (
                            <div key={index} className="story-chapter">
                                <ChapterImageLoader 
                                    image_prompt={chapter.image_prompt} 
                                    image_seed={chapter.image_seed} 
                                />
                                <div className="chapter-content">
                                    <h4>{chapter.title}</h4>
                                    <p>{chapter.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="story-moral">
                        <h4>🌟 Moral of the Story 🌟</h4>
                        <p>{generatedStory.moral}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function HomePage() {
    useEffect(() => {
        axios.get("https://kathakalpana-api.onrender.com/")
        .then(() => console.log("Backend is awake! ☀️"))
        .catch(() => console.log("Backend is still sleeping... 💤"));
    }, []);

    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Welcome to Katha Kalpana</h1>
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

function Testimonials() {
    const testimonials = [
        { name: "Emily, 8", text: "I love creating stories with Katha Kalpana! It's so much fun!", image: "https://placehold.co/80" },
        { name: "Michael, Parent", text: "Great educational tool for my kids' imagination!", image: "https://placehold.co/80" }
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
            <h2>About Katha Kalpana</h2>
            <p className="mission">Kathakalpana is your little one’s storytelling companion...</p>
        </div>
    );
}

function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <p>© 2025 Katha Kalpana. All Rights Reserved.</p>
            </div>
        </footer>
    );
}

export default App;
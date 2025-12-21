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


const ChapterImageLoader = ({ 
    image_prompt, 
    image_seed, 
    chapterIndex, 
    queueStatus, 
    queuePosition, 
    totalInQueue,
    cooldownSeconds,
    onRetry,
    onImageStatusChange
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [loadStartTime, setLoadStartTime] = useState(null);
    const hasReportedRef = useRef(false);

    const getImageUrl = (prompt, seed) => {
        if (!prompt) return "https://loremflickr.com/768/512/cartoon";
        
        const words = prompt.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        const ultraShortPrompt = words.slice(0, 5).join(' ');
        
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(ultraShortPrompt)}?width=768&height=512&seed=${seed || 1234}&nologo=true&model=flux-schnell`;
    };

    useEffect(() => {
        if (queueStatus === 'loading' && !loadStartTime) {
            console.log(`🎨 Chapter ${chapterIndex + 1}: Starting image generation`);
            setLoadStartTime(Date.now());
            setImageLoaded(false);
            setImageError(false);
            hasReportedRef.current = false;
        }
    }, [queueStatus, chapterIndex, loadStartTime]);

    // 40-second manual timeout
    useEffect(() => {
        if (queueStatus === 'loading' && loadStartTime && !imageLoaded && !imageError) {
            const timer = setTimeout(() => {
                const elapsed = ((Date.now() - loadStartTime) / 1000).toFixed(1);
                console.log(`⏰ Chapter ${chapterIndex + 1}: 40s timeout reached (actual: ${elapsed}s)`);
                setImageError(true);
            }, 40000);
            return () => clearTimeout(timer);
        }
    }, [queueStatus, loadStartTime, imageLoaded, imageError, chapterIndex]);

    // Report status changes to parent
    useEffect(() => {
        if (!hasReportedRef.current && (imageLoaded || imageError)) {
            hasReportedRef.current = true;
            if (onImageStatusChange) {
                onImageStatusChange(chapterIndex, imageLoaded);
            }
        }
    }, [imageLoaded, imageError, chapterIndex, onImageStatusChange]);

    const getStatusDisplay = () => {
        if (imageLoaded) {
            return {
                emoji: '✅',
                title: 'Ready!',
                subtitle: 'Image loaded successfully',
                color: '#4facfe'
            };
        }
        
        if (imageError) {
            return {
                emoji: '⚠️',
                title: 'Timeout Error',
                subtitle: 'Image took too long to generate',
                color: '#ff6b6b'
            };
        }

        switch (queueStatus) {
            case 'pending':
                return {
                    emoji: '⏸️',
                    title: 'Waiting in queue...',
                    subtitle: `Position: ${queuePosition + 1} of ${totalInQueue}`,
                    color: '#888'
                };
            case 'resting':
                return {
                    emoji: '⏳',
                    title: 'Resting (Rate Limit)...',
                    subtitle: `Cooldown: ${cooldownSeconds}s remaining`,
                    color: '#ffa500'
                };
            case 'loading':
                return {
                    emoji: '🎨',
                    title: 'Painting with AI...',
                    subtitle: 'Up to 40 seconds',
                    color: '#4facfe'
                };
            default:
                return {
                    emoji: '💤',
                    title: 'Idle',
                    subtitle: '',
                    color: '#666'
                };
        }
    };

    const status = getStatusDisplay();

    return (
        <div className="chapter-image-container" style={{ 
            width: '100%', minHeight: '300px', backgroundColor: '#1a1a1a', 
            borderRadius: '15px', overflow: 'hidden', position: 'relative', marginBottom: '20px' 
        }}>
            {!imageLoaded && (
                <div style={{ 
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: status.color, 
                    zIndex: imageError ? 3 : 2, padding: '20px',
                    background: imageError ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'transparent'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>{status.emoji}</div>
                    <div style={{ 
                        fontSize: '18px', marginBottom: '8px', fontWeight: '600', textAlign: 'center'
                    }}>
                        {status.title}
                    </div>
                    {status.subtitle && (
                        <div style={{ fontSize: '14px', color: '#aaa', textAlign: 'center', marginBottom: '15px' }}>
                            {status.subtitle}
                        </div>
                    )}
                    
                    {imageError && (
                        <button 
                            onClick={() => onRetry(chapterIndex)}
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
                                transition: 'all 0.3s ease'
                            }}
                        >
                            🔄 Retry This Image
                        </button>
                    )}
                </div>
            )}

            {queueStatus === 'loading' && (
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
                        const loadTime = ((Date.now() - loadStartTime) / 1000).toFixed(1);
                        console.log(`✅ Chapter ${chapterIndex + 1}: Image loaded in ${loadTime}s`);
                        setImageLoaded(true);
                        setImageError(false);
                    }}
                    onError={(e) => {
                        console.log(`❌ Chapter ${chapterIndex + 1}: Image failed to load`);
                        console.log('Error event:', e.type);
                        setImageError(true);
                    }}
                />
            )}
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
    
    const [imageQueue, setImageQueue] = useState([]); 
    const [currentProcessingIndex, setCurrentProcessingIndex] = useState(null);
    const [queueStatuses, setQueueStatuses] = useState({}); 
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [waitTime, setWaitTime] = useState(15); 
    const [failedImages, setFailedImages] = useState(new Set());
    
    const navigate = useNavigate();

    useEffect(() => {
        if (generatedStory && generatedStory.chapters) {
            const chapterIndices = generatedStory.chapters.map((_, idx) => idx);
            console.log('🗂️ Initializing image queue:', chapterIndices);
            setImageQueue(chapterIndices);
            
            const initialStatuses = {};
            chapterIndices.forEach(idx => {
                initialStatuses[idx] = 'pending';
            });
            setQueueStatuses(initialStatuses);
            setCurrentProcessingIndex(null);
            setFailedImages(new Set());
        }
    }, [generatedStory]);

    useEffect(() => {
        if (!generatedStory || imageQueue.length === 0) return;

        if (currentProcessingIndex === null && cooldownRemaining === 0) {
            const nextIndex = imageQueue[0];
            console.log(`🚀 Starting image generation for chapter ${nextIndex + 1}`);
            
            setCurrentProcessingIndex(nextIndex);
            setQueueStatuses(prev => ({ ...prev, [nextIndex]: 'loading' }));
        }
    }, [imageQueue, currentProcessingIndex, cooldownRemaining, generatedStory]);

    useEffect(() => {
        if (cooldownRemaining > 0) {
            const timer = setTimeout(() => {
                setCooldownRemaining(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownRemaining]);

    const handleImageStatusChange = useCallback((chapterIndex, success) => {
        console.log(`${success ? '✅' : '❌'} Chapter ${chapterIndex + 1} image ${success ? 'loaded' : 'failed'}`);
        
        setImageQueue(prev => prev.filter(idx => idx !== chapterIndex));
        
        setQueueStatuses(prev => ({ 
            ...prev, 
            [chapterIndex]: success ? 'success' : 'error' 
        }));

        if (!success) {
            setFailedImages(prev => new Set([...prev, chapterIndex]));
            setWaitTime(prev => {
                const newWait = Math.min(prev * 2, 60); 
                console.log(`⚠️ Image failed - increasing wait time to ${newWait}s`);
                return newWait;
            });
        } else {
            setWaitTime(prev => Math.max(Math.floor(prev * 0.75), 15));
        }

        setCurrentProcessingIndex(null);

        setImageQueue(prevQueue => {
            if (prevQueue.length > 0) {
                console.log(`⏸️ Starting ${waitTime}s cooldown before next image`);
                setCooldownRemaining(waitTime);
            }
            return prevQueue;
        });
    }, [waitTime]);

    useEffect(() => {
        if (cooldownRemaining > 0 && imageQueue.length > 0) {
            const nextIndex = imageQueue[0];
            if (queueStatuses[nextIndex] !== 'resting') {
                setQueueStatuses(prev => ({ ...prev, [nextIndex]: 'resting' }));
            }
        }
    }, [cooldownRemaining, imageQueue, queueStatuses]);

    const handleRetryImage = (chapterIndex) => {
        console.log(`🔄 Retrying image for chapter ${chapterIndex + 1}`);
        
        if (!imageQueue.includes(chapterIndex)) {
            setImageQueue(prev => [...prev, chapterIndex]);
        }
        
        setQueueStatuses(prev => ({ ...prev, [chapterIndex]: 'pending' }));
        
        setFailedImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(chapterIndex);
            return newSet;
        });
    };

    const fetchStory = async () => {
        if (!genreInput.trim()) return alert("Please enter a genre!");
        console.log("🚀 Starting story generation for genre:", genreInput);
        setLoading(true);
        setGeneratedStory(null);
        setImageQueue([]);
        setCurrentProcessingIndex(null);
        setQueueStatuses({});
        setCooldownRemaining(0);
        setWaitTime(15); 
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
                        {generatedStory.chapters.map((chapter, index) => {
                            const queuePos = imageQueue.indexOf(index);
                            const status = queueStatuses[index] || 'pending';
                            
                            return (
                                <div key={index} className="story-chapter">
                                    <ChapterImageLoader 
                                        image_prompt={chapter.image_prompt} 
                                        image_seed={chapter.image_seed}
                                        chapterIndex={index}
                                        queueStatus={status}
                                        queuePosition={queuePos >= 0 ? queuePos : imageQueue.length}
                                        totalInQueue={imageQueue.length}
                                        cooldownSeconds={cooldownRemaining}
                                        onRetry={handleRetryImage}
                                        onImageStatusChange={handleImageStatusChange}
                                    />
                                    <div className="chapter-content">
                                        <h4>{chapter.title}</h4>
                                        <p>{chapter.content}</p>
                                    </div>
                                </div>
                            );
                        })}
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
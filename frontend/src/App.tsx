import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Book, LogOut, Sparkles } from 'lucide-react';
import './App.css';
import { supabase } from './lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import Login from './components/Login';
import Library from './components/Library';
import StoryGenerator from './components/StoryGenerator';
import StoryReader from './components/StoryReader';
import PetDashboard from './components/PetDashBoard';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      if (mounted) {
        setSession(nextSession);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (nextSession: Session | null) => {
    setSession(nextSession);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!authReady) return null;
    if (!session) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <h1 className="title">
            Katha Kalpana
          </h1>
          <div className="nav-links">
            <Link to="/">Home</Link>
            {session && (
              <>
                <Link to="/generate">Create</Link>
                <Link to="/library">Library</Link>
                <Link to="/pet">Chotuu</Link>
              </>
            )}
            {session ? (
              <button
                onClick={handleLogout} 
                className="logout-btn"
              >
                <LogOut size={16} /> Logout
              </button>
            ) : (
              <Link to="/login">
                Login
              </Link>
            )}
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/generate" element={<ProtectedRoute><StoryGenerator token={session?.access_token ?? ''} /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/read" element={<ProtectedRoute><StoryReader /></ProtectedRoute>} />
            <Route path="/pet" element={<ProtectedRoute><PetDashboard /></ProtectedRoute>} />
          </Routes>
        </main>

        <footer className="app-footer">Made with ❤ for little storytellers</footer>
      </div>
    </Router>
  );
};

const HomePage = () => (
  <>
    <section className="hero-section">
      <h1>Where Imagination Lives</h1>
      <p>Bring stories to life with AI-powered narration and magical illustrations.</p>
      <Link to="/generate" className="cta-button">
        Get Started <Book size={18} />
      </Link>
    </section>

    <section className="features-section">
      <div className="feature">
        <Book />
        <h3>Generate Stories</h3>
        <p>Create magical chapter-based adventures from any idea.</p>
      </div>
      <div className="feature">
        <Sparkles />
        <h3>Read & Listen</h3>
        <p>Enjoy story pages and optional narration for kids.</p>
      </div>
      <div className="feature">
        <LogOut />
        <h3>Save to Library</h3>
        <p>Keep your favorites and revisit them anytime.</p>
      </div>
    </section>
  </>
);

export default App;
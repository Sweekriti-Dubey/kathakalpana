import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Book, LogOut, Sparkles } from 'lucide-react';
import './App.css';
import { isFrontendConfigured, missingFrontendEnvVars, requireSupabaseClient } from './lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import Login from './components/Login';

// Lazy load components for better code splitting
const Library = React.lazy(() => import('./components/Library'));
const StoryGenerator = React.lazy(() => import('./components/StoryGenerator'));
const StoryReader = React.lazy(() => import('./components/StoryReader'));
const PetDashboard = React.lazy(() => import('./components/PetDashBoard'));

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!isFrontendConfigured) {
      setAuthReady(true);
      return () => {
        mounted = false;
      };
    }

    const client = requireSupabaseClient();

    const initAuth = async () => {
      const { data } = await client.auth.getSession();
      if (mounted) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    };

    initAuth();

    const { data: subscription } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
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
    requireSupabaseClient().auth.signOut();
  };

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!authReady) return null;
    if (!session) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  if (!isFrontendConfigured) {
    return <ConfigurationErrorScreen missingVars={missingFrontendEnvVars} />;
  }

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
            <Route 
              path="/generate" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <StoryGenerator token={session?.access_token ?? ''} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/library" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Library />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/read" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <StoryReader />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pet" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PetDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
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

const LoadingSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        display: 'inline-block',
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255, 107, 158, 0.2)',
        borderTop: '4px solid #FF6B9E',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#888', marginTop: '12px', fontSize: '0.9em' }}>Loading...</p>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const ConfigurationErrorScreen = ({ missingVars }: { missingVars: string[] }) => (
  <div className="config-error-screen">
    <section className="config-error-card">
      <p className="config-error-eyebrow">Deployment configuration required</p>
      <h1>Frontend env vars are missing.</h1>
      <p>
        Vite only exposes browser env vars that start with <code>VITE_</code>. Your Vercel build is missing the values below,
        so the app cannot create the Supabase client.
      </p>

      <div className="config-error-list">
        {missingVars.map((variableName) => (
          <code key={variableName}>{variableName}</code>
        ))}
      </div>

      <p>
        Add them in Vercel Project Settings &gt; Environment Variables for the relevant environments, then redeploy.
      </p>
    </section>
  </div>
);

export default App;
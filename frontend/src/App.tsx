import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Book, LogOut, Sparkles, Zap, TrendingUp, Bookmark } from 'lucide-react';
import './App.css';
import { isFrontendConfigured, missingFrontendEnvVars, requireSupabaseClient } from './lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import Login from './components/Login';
import LibraryDoors from './components/LibraryDoors';

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

  const handleLogin = (nextSession: Session | null) => setSession(nextSession);
  const handleLogout = () => requireSupabaseClient().auth.signOut();

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
          <h1 className="title">Katha Kalpana</h1>
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
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={15} /> Logout
              </button>
            ) : (
              <Link to="/login">Login</Link>
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

const HomePage = () => {
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());
  const [leavingFeatures, setLeavingFeatures] = useState<Set<number>>(new Set());
  const featureRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const timeoutRefs = React.useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          
          if (entry.isIntersecting) {
            // Feature entering viewport
            setVisibleFeatures(prev => new Set([...prev, index]));
            // Clear leaving state
            if (timeoutRefs.current.has(index)) {
              clearTimeout(timeoutRefs.current.get(index)!);
              timeoutRefs.current.delete(index);
            }
            setLeavingFeatures(prev => {
              const updated = new Set(prev);
              updated.delete(index);
              return updated;
            });
          } else {
            // Feature leaving viewport - trigger slide-out animation
            setLeavingFeatures(prev => new Set([...prev, index]));
            
            // Remove from visible after animation
            const timeout = setTimeout(() => {
              setVisibleFeatures(prev => {
                const updated = new Set(prev);
                updated.delete(index);
                return updated;
              });
              setLeavingFeatures(prev => {
                const updated = new Set(prev);
                updated.delete(index);
                return updated;
              });
              timeoutRefs.current.delete(index);
            }, 2000); // Match animation duration
            
            timeoutRefs.current.set(index, timeout);
          }
        });
      },
      { threshold: 0.3 }
    );

    featureRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      featureRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const features = [
    { icon: Book, title: 'Generate Stories', desc: 'Create magical chapter-based adventures from any idea — dragons, robots, or talking samosas.' },
    { icon: Sparkles, title: 'Read & Listen', desc: 'Enjoy illustrated story pages with optional narration designed for young readers.' },
    { icon: Bookmark, title: 'Save to Library', desc: 'Keep your favourite stories and revisit them anytime across all your devices.' },
    { icon: Zap, title: 'Feed Your Pet', desc: 'Your virtual companion Chotuu grows stronger and happier with every story you read.' },
    { icon: TrendingUp, title: 'Build Streaks & Flex', desc: 'Track reading streaks, level up your pet, and show off achievements to friends.' },
  ];

  return (
    <>
      <LibraryDoors />

      <h2 className="section-title">Why kids love Katha Kalpana</h2>

      <section className="features-section">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          const isVisible = visibleFeatures.has(index);
          const isLeaving = leavingFeatures.has(index);
          const fromRight = index % 2 === 0;
          
          let animationClass = 'feature-hidden';
          if (isLeaving) {
            // Slide out in the direction they came from (alternating)
            animationClass = fromRight ? 'slide-out-right' : 'slide-out-left';
          } else if (isVisible) {
            // Slide in from alternating directions
            animationClass = fromRight ? 'slide-in-right' : 'slide-in-left';
          }
          
          return (
            <div
              key={index}
              ref={(el) => { featureRefs.current[index] = el; }}
              data-index={index}
              className={`feature ${animationClass}`}
            >
              <div className="feature-icon"><IconComponent size={24} /></div>
              <div className="feature-text">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
};

const LoadingSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        width: '48px',
        height: '48px',
        border: '3px solid rgba(255,95,160,0.15)',
        borderTop: '3px solid #ff5fa0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#555', marginTop: '14px', fontSize: '0.88em' }}>Loading…</p>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ConfigurationErrorScreen = ({ missingVars }: { missingVars: string[] }) => (
  <div className="config-error-screen">
    <section className="config-error-card">
      <p className="config-error-eyebrow">Deployment configuration required</p>
      <h1>Frontend env vars are missing.</h1>
      <p>
        Vite only exposes browser env vars that start with <code>VITE_</code>. Your Vercel build
        is missing the values below, so the app cannot create the Supabase client.
      </p>
      <div className="config-error-list">
        {missingVars.map((v) => <code key={v}>{v}</code>)}
      </div>
      <p>Add them in Vercel → Project Settings → Environment Variables, then redeploy.</p>
    </section>
  </div>
);

export default App;
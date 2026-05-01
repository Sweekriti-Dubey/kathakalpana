import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Book, LogOut, Sparkles, Zap, TrendingUp, Bookmark} from 'lucide-react';
import { isFrontendConfigured, missingFrontendEnvVars, requireSupabaseClient } from './lib/supabaseClient';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';


import Login from './components/Login';
import TitleContainer from './components/TitleContainer';

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
    <ThemeProvider>
      <Router>
        <div className="max-w-6xl mx-auto px-6 pt-5 pb-15 min-h-screen">
          <nav className="flex justify-between items-center px-9 py-4 bg-app-surface/75 backdrop-blur-xl border border-app-border rounded-2xl mb-6 sticky top-4 z-50 shadow-2xl transition-colors md:flex-row flex-col">
            <h1 className="title">Katha Kalpana</h1>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-app-muted px-4 py-2 rounded-xl text-sm font-medium hover:text-app-text transition-colors">Home</Link>
              {session && (
                <>
                  <Link to="/generate" className="text-app-muted px-4 py-2 rounded-xl text-sm font-medium hover:text-app-text transition-colors">Create</Link>
                  <Link to="/library" className="text-app-muted px-4 py-2 rounded-xl text-sm font-medium hover:text-app-text transition-colors">Library</Link>
                  <Link to="/pet" className="text-app-muted px-4 py-2 rounded-xl text-sm font-medium hover:text-app-text transition-colors">Chotuu</Link>
                </>
              )}
              <ThemeToggle />
              {session ? (
                <button onClick={handleLogout} className="bg-app-pink/15 border border-app-pink/30 text-app-pink px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-app-pink/25 flex items-center gap-1.5">
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

          <footer className="text-center p-6 mt-16 border-t border-app-border text-app-muted text-sm tracking-wide transition-colors">Made with ❤ for little storytellers</footer>
        </div>
      </Router>
    </ThemeProvider>
  );
};

const HomePage = () => {
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());
  const [leavingFeatures, setLeavingFeatures] = useState<Set<number>>(new Set());
  const featureRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const timeoutRefs = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          
          if (entry.isIntersecting) {
            setVisibleFeatures(prev => new Set([...prev, index]));
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
            setLeavingFeatures(prev => new Set([...prev, index]));
            
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
            }, 2000);
            
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
      <TitleContainer />

      <h2 style={{ fontSize: '2.4em', textAlign: 'center', marginBottom: '28px', marginTop: '48px' }}>
        Why kids love Katha Kalpana
      </h2>

      <section className="flex flex-col gap-4 max-w-3xl mx-auto mb-10">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          const isVisible = visibleFeatures.has(index);
          const isLeaving = leavingFeatures.has(index);
          const fromRight = index % 2 === 0;
          
          let animationClass = 'feature-hidden';
          if (isLeaving) {
            animationClass = fromRight ? 'animate-scrollSlideOutRight' : 'animate-scrollSlideOutLeft';
          } else if (isVisible) {
            animationClass = fromRight ? 'animate-scrollSlideFromRight' : 'animate-scrollSlideFromLeft';
          }
          
          return (
            <div
              key={index}
              ref={(el) => { featureRefs.current[index] = el; }}
              data-index={index}
              className={`card-base flex items-center gap-6 px-8 py-12 text-left cursor-default hover:scale-101 ${animationClass}`}
              style={{
                backgroundColor: 'rgb(var(--app-surface))',
              }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center border border-app-pink border-opacity-20 bg-app-pink bg-opacity-10">
                <IconComponent size={24} className={`w-6 h-6 ${index === 0 ? 'text-app-pink' : index === 1 ? 'text-app-violet' : index === 2 ? 'text-app-cyan' : index === 3 ? 'text-app-gold' : 'text-app-green'}`} />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-1.5 transition-colors hover:text-violet-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-app-muted leading-1.55">
                  {feature.desc}
                </p>
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
  <div className="min-h-screen grid place-items-center p-6">
    <section className="w-full max-w-2xl p-10 rounded-3xl bg-app-surface border border-app-pink/30 shadow-2xl">
      <p className="text-app-pink uppercase tracking-[0.16em] text-[0.76rem] font-semibold mb-3">Deployment configuration required</p>
      <h1 className="font-playfair text-[clamp(1.8rem,4vw,2.6rem)] text-app-text mb-4">Frontend env vars are missing.</h1>
      <p className="text-app-muted">
        Vite only exposes browser env vars that start with <code>VITE_</code>. Your Vercel build
        is missing the values below, so the app cannot create the Supabase client.
      </p>
      <div className="flex flex-wrap gap-2.5 my-6">
        {missingVars.map((v) => <code key={v} className="px-4 py-2.5 rounded-full bg-app-pink/10 border border-app-pink/25 text-app-pink text-sm">{v}</code>)}
      </div>
      <p className="text-app-muted">Add them in Vercel → Project Settings → Environment Variables, then redeploy.</p>
    </section>
  </div>
);

export default App;
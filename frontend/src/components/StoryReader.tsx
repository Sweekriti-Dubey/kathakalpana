import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, CheckCircle, Play, Square, Save, Maximize2, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { PetStatus, Story } from '../types';
import { requireSupabaseClient } from '../lib/supabaseClient';

const StoryReader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const supabase = requireSupabaseClient();
  const story = location.state?.story as Story;
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petGrowth, setPetGrowth] = useState<PetStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFoodFeeding, setShowFoodFeeding] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState(false);
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const completeUrl = `${functionsBaseUrl}/complete-reading`;
  const petStatusUrl = `${functionsBaseUrl}/pet-status`;
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

  const foodOptions = [
    { id: 'panipuri', name: 'Panipuri 🥣', image: '/assets/food/panipuri.jpeg' },
    { id: 'burger', name: 'Burger 🍔', image: '/assets/food/burger.jpeg' },
    { id: 'pizza', name: 'Pizza 🍕', image: '/assets/food/pizza.jpeg' },
    { id: 'apple', name: 'Apple 🍎', image: '/assets/food/apple.jpeg' }
  ];

  React.useEffect(() => {
    const stopAudio = () => {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    };

    return () => {
      stopAudio();
    };
  }, []);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      window.speechSynthesis.cancel();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullView) setIsFullView(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullView]);

  if (!story) {
    navigate('/library');
    return null;
  }

  const totalChapters = story.chapters.length;
  const progress = totalChapters > 0 ? ((currentPage + 1) / totalChapters) * 100 : 0;

  const changePage = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < totalChapters - 1) {
      setFlipDirection('next');
      setCurrentPage((page) => page + 1);
      return;
    }

    if (direction === 'prev' && currentPage > 0) {
      setFlipDirection('prev');
      setCurrentPage((page) => page - 1);
    }
  };

  // Critical: Ensures valid tokens for all API requests. Checks JWT expiry and refreshes if<60s remaining.
  // Prevents silent auth failures mid-reading and ensures pet growth updates don't fail due to token expiry.
  const getAccessToken = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let token = sessionData.session?.access_token ?? '';
    const exp = token
      ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp as number | undefined
      : undefined;
    const now = Math.floor(Date.now() / 1000);

    if (exp && exp - now < 60) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      token = refreshed.session?.access_token ?? token;
    }

    if (!token) throw new Error('Session expired. Please log in again.');
    return token;
  // Important: Uses Web Speech API for text-to-speech narration. Rate/pitch tuning (0.95/1.05) ensures
  // natural, engaging audio for young readers. Cleanup callbacks prevent state updates if component unmounts during speech.
  };

  const toggleNarration = () => {
    const chapter = story.chapters[currentPage];
    if (!chapter) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const text = `${chapter.title}. ${chapter.content}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => {
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
    };
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  // Critical: Persists generated stories to library for later access. Enables reading history and favorites.
  // Uses Supabase auth middleware to attach story to authenticated user's account.
  };

  const saveStory = async () => {
    if (!functionsBaseUrl) {
      setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const saveUrl = `${functionsBaseUrl}/save-story`;
      await axios.post(saveUrl, story, {
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey }
      });
      setSaved(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const backendMessage =
          (typeof err.response?.data?.error === 'string' && err.response.data.error) ||
          err.message;
        setError(`Failed to save story: ${backendMessage}`);
      } else {
        setError('Failed to save story. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Important: Triggers pet growth interaction when user completes story. Opens food feeding modal
  // which allows users to "feed" their pet and trigger evolution animations.
  const handleFinish = async () => {
    setShowFoodFeeding(true);
  };

  // Critical: Core engagement mechanic. Records reading completion and pet feeding choice via backend,
  // then fetches updated pet stats (level, XP, evolution stage) to show growth achievements.
  // Motivates repeat story reads by showing immediate pet progression and evolution milestones.
  const handleFoodSelected = async (foodId: string) => {
    setSelectedFood(foodId);
    if (!functionsBaseUrl) {
      setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();

      await axios.post(
        completeUrl, 
        { food: foodId },
        { headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey } }
      );

      const petRes = await axios.get(petStatusUrl, {
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey }
      });

      setPetGrowth(petRes.data);
      setShowFoodFeeding(false);
    } catch (err) {
      console.error("Failed to update stats:", err);
      if (axios.isAxiosError(err)) {
        const backendMessage =
          (typeof err.response?.data?.error === 'string' && err.response.data.error) ||
          err.message;
        setError(`Failed to update reading progress: ${backendMessage}`);
      } else {
        setError('Failed to update reading progress. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const ChapterContent = ({ inFullView = false }: { inFullView?: boolean }) => (
    <div
      key={currentPage}
      className={`bg-neutral-900/50 border border-neutral-800 rounded-3xl shadow-2xl backdrop-blur-sm transition-all duration-500 ease-out animate-in ${flipDirection === 'next' ? 'fade-in slide-in-from-right-4' : 'fade-in slide-in-from-left-4'}`}
      style={{
        height: '100%',
        overflow: 'auto',
        padding: inFullView ? '32px 40px' : '24px 32px',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={() => setIsFullView(!inFullView)}
        title={inFullView ? 'Exit full view' : 'Full view'}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: '7px 9px',
          cursor: 'pointer',
          color: '#a78bfa',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.78em',
          fontWeight: 600,
          transition: 'background 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      >
        {inFullView ? <X size={15} /> : <Maximize2 size={15} />}
        {inFullView ? 'Exit' : 'Full View'}
      </button>

      <div className="space-y-4">
        <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">
          Chapter {currentPage + 1}
        </span>
        {story.chapters[currentPage].image_url && (
          <img
            src={story.chapters[currentPage].image_url}
            alt={`${story.chapters[currentPage].title} illustration`}
            className="w-full rounded-2xl border border-neutral-800"
            style={{ maxHeight: inFullView ? '55vh' : '58vh', objectFit: 'contain' }}
          />
        )}
        <h2 className={`font-extrabold text-white leading-tight ${inFullView ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
          {story.chapters[currentPage].title}
        </h2>
        <p className={`text-neutral-300 leading-relaxed font-light ${inFullView ? 'text-lg md:text-xl' : 'text-base md:text-lg'}`}>
          {story.chapters[currentPage].content}
        </p>
        {currentPage === totalChapters - 1 && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(167, 139, 250, 0.2)' }}>
            <p className="text-purple-300 italic font-medium text-center" style={{ fontSize: inFullView ? '1.1em' : '0.95em' }}>"{story.moral}"</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isFullView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsFullView(false); }}
        >
          <div
            style={{
              width: '90vw',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative', perspective: '1600px' }}>
              <ChapterContent inFullView={true} />
            </div>

            <div className="flex items-center justify-between" style={{ background: 'rgba(18,18,18,0.92)', backdropFilter: 'blur(8px)', padding: '8px 0 10px', borderRadius: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
              <button
                disabled={currentPage === 0}
                onClick={() => changePage('prev')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft /> Previous
              </button>

              <div className="text-neutral-500 text-sm">
                {currentPage + 1} of {totalChapters}
              </div>

              {currentPage < totalChapters - 1 ? (
                <button
                  onClick={() => changePage('next')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/20"
                >
                  Next <ChevronRight />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading || Boolean(petGrowth)}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold animate-pulse shadow-lg shadow-green-500/20"
                >
                  {loading ? 'Finishing...' : petGrowth ? 'Finished' : 'Finish'} <CheckCircle />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="max-w-5xl mx-auto animate-in fade-in duration-700"
        style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}
      >
      
      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-end gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={toggleNarration}
            className={`audio-btn ${isPlaying ? 'playing' : ''}`}
            style={{ marginTop: 0, minWidth: 'auto', padding: '10px 16px' }}
          >
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stop Audio' : 'Play Audio'}
          </button>
          <button
            type="button"
            onClick={saveStory}
            disabled={saving || saved}
            style={{ marginTop: 0, minWidth: 'auto', padding: '10px 16px' }}
          >
            <Save size={16} style={{ marginRight: 8 }} />
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save to Library'}
          </button>
        </div>

        <div className="relative" style={{ perspective: '1600px', flex: 1, minHeight: 0 }}>
          <div className="absolute inset-y-4 -left-1 w-6 rounded-l-2xl bg-black/30 blur-sm" />
          <div className="absolute inset-y-4 -right-1 w-6 rounded-r-2xl bg-black/30 blur-sm" />
          <ChapterContent inFullView={false} />
        </div>

        <div
          className="flex items-center justify-between"
          style={{ background: 'rgba(18,18,18,0.92)', backdropFilter: 'blur(8px)', padding: '8px 0 10px', zIndex: 5 }}
        >
          <button
            disabled={currentPage === 0}
            onClick={() => changePage('prev')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft /> Previous
          </button>

          <div className="text-neutral-500 text-sm">
            {currentPage + 1} of {totalChapters}
          </div>

          {currentPage < totalChapters - 1 ? (
            <button
              onClick={() => changePage('next')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/20"
            >
              Next <ChevronRight />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || Boolean(petGrowth)}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold animate-pulse shadow-lg shadow-green-500/20"
            >
              {loading ? 'Finishing...' : petGrowth ? 'Finished' : 'Finish'} <CheckCircle />
            </button>
          )}
        </div>

        {error && (
          <div className="text-center text-red-400 text-sm">{error}</div>
        )}
      </div>
      {petGrowth && (
        <div style={{ position: 'fixed', right: '40px', bottom: '40px', zIndex: 250, maxWidth: '400px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
            border: '2px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '25px',
            padding: '30px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '2.5em', marginBottom: '15px' }}>🎉</p>
            <p style={{ color: '#ECFDF5', fontSize: '1.4em', fontWeight: 'bold', marginBottom: '20px' }}>
              Your pet grew!
            </p>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
              <p style={{ color: '#D1FAE5', fontSize: '1.1em', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>{petGrowth.pet_name}</span>
              </p>
              <p style={{ color: '#D1FAE5', fontSize: '1em', marginBottom: '8px' }}>
                Stage: <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{petGrowth.evolution_stage}</span>
              </p>
              <p style={{ color: '#D1FAE5', fontSize: '1em' }}>
                Level: <span style={{ fontWeight: 'bold' }}>{petGrowth.level}</span> · XP: <span style={{ fontWeight: 'bold' }}>{petGrowth.xp}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/pet')}
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '20px',
                fontSize: '1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View Chotuu
            </button>
          </div>
        </div>
      )}



      {showFoodFeeding && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1E1E1E',
            borderRadius: '20px',
            padding: '25px',
            maxWidth: '380px',
            border: '2px solid rgba(255, 107, 158, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#FF6B9E', fontSize: '1.4em', marginBottom: '15px', fontWeight: 'bold' }}>
              🐲 Feed Chotuu!
            </h2>
            
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <DotLottieReact
                src="https://lottie.host/ede28d81-acb0-4fe9-a9df-42f14c67ae4a/BEyZkJV2Ug.lottie"
                loop
                autoplay
                style={{ width: '180px', height: '180px' }}
              />
            </div>

            <p style={{ color: '#E0E0E0', marginBottom: '20px', fontSize: '0.95em' }}>
              Choose a food:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {foodOptions.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleFoodSelected(food.id)}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: selectedFood === food.id ? '2.5px solid #FF6B9E' : '2.5px solid rgba(255, 255, 255, 0.2)',
                    cursor: loading || selectedFood !== null ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: loading && selectedFood !== food.id ? 0.5 : 1,
                    transform: selectedFood === food.id ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: selectedFood === food.id ? '0 0 20px rgba(255, 107, 158, 0.5)' : 'none',
                    backgroundColor: selectedFood === food.id ? 'rgba(255, 107, 158, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && selectedFood === null) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 107, 158, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFood === null) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <img
                    src={food.image}
                    alt={food.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '80px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>
              ))}
            </div>

            {selectedFood && (
              <div style={{
                position: 'relative',
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FF6B9E, #FF85B8)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '0.95em',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 20px rgba(255, 107, 158, 0.4)',
                  position: 'relative',
                  animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}>
                  {loading ? '🦉 Om nom nom... ✨' : '✓ Yummy!'}
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid #FF6B9E'
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StoryReader;
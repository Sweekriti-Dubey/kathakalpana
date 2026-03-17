import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, CheckCircle, Sparkles, Play, Square, Save } from 'lucide-react';
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
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const completeUrl = `${functionsBaseUrl}/complete-reading`;
  const petStatusUrl = `${functionsBaseUrl}/pet-status`;
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

  // Stop audio playback on component unmount or navigation
  React.useEffect(() => {
    const stopAudio = () => {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    };

    // Stop audio when user leaves the page (navigation)
    return () => {
      stopAudio();
    };
  }, []);

  // Stop audio when closing/unloading the app
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      window.speechSynthesis.cancel();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  const handleFinish = async () => {
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
        {}, 
        { headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey } }
      );

      const petRes = await axios.get(petStatusUrl, {
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey }
      });

      setPetGrowth(petRes.data);
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

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
      
      {/* Progress Bar Container */}
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

      {/* Flip Book Chapter Card */}
      <div className="relative" style={{ perspective: '1600px', flex: 1, minHeight: 0 }}>
        <div className="absolute inset-y-4 -left-1 w-6 rounded-l-2xl bg-black/30 blur-sm" />
        <div className="absolute inset-y-4 -right-1 w-6 rounded-r-2xl bg-black/30 blur-sm" />

        <div
          key={currentPage}
          className={`bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm transition-all duration-500 ease-out animate-in ${flipDirection === 'next' ? 'fade-in slide-in-from-right-4' : 'fade-in slide-in-from-left-4'}`}
          style={{ height: '100%', overflow: 'auto' }}
        >
          <div className="space-y-4">
            <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">
              Chapter {currentPage + 1}
            </span>
            {story.chapters[currentPage].image_url && (
              <img
                src={story.chapters[currentPage].image_url}
                alt={`${story.chapters[currentPage].title} illustration`}
                className="w-full rounded-2xl border border-neutral-800"
                style={{ maxHeight: '36vh', objectFit: 'contain' }}
              />
            )}
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              {story.chapters[currentPage].title}
            </h2>
            <p className="text-base md:text-lg text-neutral-300 leading-relaxed font-light">
              {story.chapters[currentPage].content}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between" style={{ background: 'rgba(18,18,18,0.92)', backdropFilter: 'blur(8px)', padding: '8px 0 10px', zIndex: 5 }}>
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

      {petGrowth && (
        <div className="max-w-sm bg-emerald-950/90 border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-3" style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 50 }}>
          <p className="text-emerald-200 text-sm font-semibold">🎉 Your pet grew after this story!</p>
          <div className="text-xs text-emerald-100/90 space-y-1">
            <p>Name: <span className="font-bold">{petGrowth.pet_name}</span></p>
            <p>Stage: <span className="font-bold capitalize">{petGrowth.evolution_stage}</span></p>
            <p>Level: <span className="font-bold">{petGrowth.level}</span> · XP: <span className="font-bold">{petGrowth.xp}</span></p>
          </div>
          <button
            onClick={() => navigate('/pet')}
            className="self-start px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            Go to Chotuu page
          </button>
        </div>
      )}

      {/* Moral Section (Fixed overlay at bottom center - only shown on last page) */}
      {currentPage === totalChapters - 1 && (
        <div className="max-w-md bg-purple-950/90 border border-purple-500/40 rounded-2xl p-4 flex flex-col items-center gap-2" style={{ position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 40 }}>
          <Sparkles className="text-purple-400" size={18} />
          <p className="text-purple-200 italic font-medium text-sm text-center">"{story.moral}"</p>
        </div>
      )}
    </div>
  );
};

export default StoryReader;
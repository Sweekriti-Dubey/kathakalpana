import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, CheckCircle, Play, Square, Save, Maximize2, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { PetStatus, Story } from '../types';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { useWordTooltip } from '../hooks/useWordTooltip';
import { tokenizeContent, getCleanWord, isClickableWord } from '../utils/tokenizeContent';
import WordTooltipPanel from './WordTooltipPanel';

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
  const { state: tooltipState, open: openTooltip, close: closeTooltip } = useWordTooltip();
  const [showAllChaptersView, setShowAllChaptersView] = useState(false);
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
    closeTooltip();
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
    setShowFoodFeeding(true);
  };

  
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

  const renderClickableText = ( text: string ) => (
    <>
      {tokenizeContent(text).map((token, i) => 
        isClickableWord(token) ? (
          <span 
            key={i}
            onClick={(e) => openTooltip(getCleanWord(token), e.currentTarget)}
            className="cursor-pointer rounded-[3px] transition-colors duration-150 hover:bg-[rgba(167,139,250,0.12)]"
          >
              {token}
            </span>
        
        ) : (
          <span key={i}>{token}</span>
        )
      )}
    </>
  );

  const ChapterContent = ({ inFullView = false }: { inFullView?: boolean }) => (
    <div
      key={currentPage}
      className={`card-base transition-all duration-500 ease-out animate-in bg-[#131120]/70 h-full overflow-auto relative ${inFullView ? 'py-8 px-10' : 'py-6 px-8'} ${flipDirection === 'next' ? 'fade-in slide-in-from-right-4' : 'fade-in slide-in-from-left-4'}`}
    >
      <button
        type="button"
        onClick={() => setIsFullView(!inFullView)}
        title={inFullView ? 'Exit full view' : 'Full view'}
        className="absolute top-4 right-4 bg-white/[0.07] border border-white/[0.15] rounded-[10px] py-[7px] px-[9px] cursor-pointer text-[#a78bfa] flex items-center gap-[5px] text-[0.78em] font-semibold transition-colors duration-200 z-10 hover:bg-[rgba(167,139,250,0.15)]"
      >
        {inFullView ? <X size={15} /> : <Maximize2 size={15} />}
        {inFullView ? 'Exit' : 'Full View'}
      </button>

      <div className="space-y-4">
        <span className="story-text-accent chapter-label font-bold tracking-widest uppercase text-sm">
          Chapter {currentPage + 1}
        </span>
        {story.chapters[currentPage].image_url && (
          <img
            src={story.chapters[currentPage].image_url}
            alt={`${story.chapters[currentPage].title} illustration`}
            className={`w-full rounded-2xl border border-neutral-800 object-contain ${inFullView ? 'max-h-[55vh]' : 'max-h-[58vh]'}`}
          />
        )}
        <h2 className={`chapter-title font-extrabold leading-tight ${inFullView ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
          {story.chapters[currentPage].title}
        </h2>
        <p className={`story-text-secondary leading-relaxed font-light ${inFullView ? 'text-lg md:text-xl' : 'text-base md:text-lg'}`}>
          {renderClickableText(story.chapters[currentPage].content)}
        </p>
        {currentPage === totalChapters - 1 && (
          <div className="mt-8 pt-6 border-t border-[rgba(167,139,250,0.2)]">
            <p className={`story-text-accent italic font-medium text-center ${inFullView ? 'text-[1.1em]' : 'text-[0.95em]'}`}>"{story.moral}"</p>
          </div>
        )}
      </div>
    </div>
  );

  const AllChaptersView = () => (
    <div
      className="card-base overflow-auto h-full py-8 px-10 "
    >
      <div className="space-y-16 relative z-10">
        {story.chapters.map((chapter, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className = 'w-1 h-10 bg-gradient-to-br from-[#a78bfa] to-[#ff5fa0] rounded-sm'/>
              <span className="story-text-accent chapter-label font-bold tracking-widest uppercase text-sm">
                Chapter {idx + 1}
              </span>
            </div>

            {chapter.image_url && (
              <img
                src={chapter.image_url}
                alt={`${chapter.title} illustration`}
                className="w-full rounded-2xl border border-neutral-800 max-h-[40vh] object-contain mb-4"
              />
            )}

            <h3 className="chapter-title font-extrabold text-2xl md:text-3xl leading-tight">
              {chapter.title}
            </h3>

            <p className="story-text-secondary leading-relaxed font-light text-base md:text-lg">
              {renderClickableText(chapter.content)}
            </p>

            {idx === totalChapters - 1 && (
              <div className="mt-8 pt-6 border-t border-[rgba(167,139,250,0.2)]">
                <p className="story-text-accent italic font-medium text-center text-lg">
                  "{story.moral}"
                </p>
              </div>
            )}

            {idx < totalChapters - 1 && (
              <div className="all-chapters-divider h-[1px] my-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {isFullView && (
        <div
          className="card-base fixed inset-0 flex items-center justify-center p-5 z-[150] bg-[#131120]/70 backdrop-blur-md overflow-hidden rounded-none border-none shadow-none"
          onClick={(e) => { if (e.target === e.currentTarget) setIsFullView(false); }}
        >
          <div className="w-[90vw] h-[90vh] flex flex-col gap-[14px]">
            <div className="progress-bar-dark w-full h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Tab Toggle */}
            <div className="story-reader-tab-container flex gap-3 p-2 rounded-xl w-fit bg-[#131120]/50 backdrop-blur-[8px] border border-[rgba(167,139,250,0.1)]">
              <button
                onClick={() => setShowAllChaptersView(false)}
                className={`px-5 py-[10px] rounded-lg border-none cursor-pointer text-[0.95em] transition-all duration-200 ${
                  !showAllChaptersView 
                    ? 'bg-[rgba(167,139,250,0.3)] text-[#a78bfa] font-semibold border-l-2 border-[#a78bfa] hover:bg-[rgba(167,139,250,0.4)]' 
                    : 'bg-transparent text-[#999] font-medium border-l-0'
                }`}
              >
                📖 Current Chapter
              </button>
              <button
                onClick={() => setShowAllChaptersView(true)}
                className={`px-5 py-[10px] rounded-lg border-none cursor-pointer text-[0.95em] transition-all duration-200 ${
                  showAllChaptersView 
                    ? 'bg-[rgba(167,139,250,0.3)] text-[#a78bfa] font-semibold border-l-2 border-[#a78bfa] hover:bg-[rgba(167,139,250,0.4)]' 
                    : 'bg-transparent text-[#999] font-medium border-l-0'
                }`}
              >
                📚 All Chapters
              </button>
            </div>

            <div className="flex-1 min-h-0 relative [perspective:1600px]">
              {showAllChaptersView ? AllChaptersView() : ChapterContent({ inFullView: true })}
            </div>

            
            {!showAllChaptersView && (
              <div className="story-nav-bar flex items-center justify-between pt-2 pb-2.5 px-4 rounded-2xl">
                <button
                  disabled={currentPage === 0}
                  onClick={() => changePage('prev')}
                  className="button"
                >
                  <ChevronLeft /> Previous
                </button>

                <div className="story-text-muted text-sm">
                  {currentPage + 1} of {totalChapters}
                </div>

                {currentPage < totalChapters - 1 ? (
                  <button
                    onClick={() => changePage('next')}
                    className="button"
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
            )}
          </div>
        </div>
      )}

      <div
        className="max-w-5xl mx-auto animate-in fade-in duration-700 h-[calc(100vh-120px)] flex flex-col gap-[10px] overflow-hidden"
      >
      
      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleNarration}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border-[1.5px] ${isPlaying ? 'border-red-400 text-red-400 bg-red-400/10' : 'bg-transparent border-app-pink text-app-pink hover:bg-app-pink/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-app-pink/25'}`}
          >
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stop Audio' : 'Play Audio'}
          </button>
          <button
            type="button"
            onClick={saveStory}
            disabled={saving || saved}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-app-violet/20 to-app-pink/15 text-app-violet px-4 py-2.5 rounded-full text-sm font-semibold border-[1.5px] border-app-violet/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-app-violet/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save to Library'}
          </button>
        </div>

        <div className="relative [perspective:1600px] flex-1 min-h-0">
          <div className="absolute inset-y-4 -left-1 w-6 rounded-l-2xl bg-black/30 blur-sm" />
          <div className="absolute inset-y-4 -right-1 w-6 rounded-r-2xl bg-black/30 blur-sm" />
          {ChapterContent({ inFullView: false })}
        </div>

        <div className="story-nav-bar flex items-center justify-between pt-2 pb-2.5 z-[5]">
          <button
            disabled={currentPage === 0}
            onClick={() => changePage('prev')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft /> Previous
          </button>

          <div className="story-text-muted text-sm">
            {currentPage + 1} of {totalChapters}
          </div>

          {currentPage < totalChapters - 1 ? (
            <button
              onClick={() => changePage('next')}
              className="story-nav-button flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] shadow-[0_8px_16px_rgba(139,92,246,0.3)]"
            >
              Next <ChevronRight />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || Boolean(petGrowth)}
              className="story-nav-button flex items-center gap-2 px-8 py-3 rounded-xl font-bold animate-pulse bg-gradient-to-br from-[#22c55e] to-[#10b981] shadow-[0_8px_16px_rgba(34,197,94,0.3)]"
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
        <div className="fixed right-10 bottom-10 z-[250] max-w-[400px]">
          <div className="bg-gradient-to-br from-[#10b981]/95 to-[#059669]/95 border-2 border-[#22c55e]/50 rounded-[25px] p-[30px] shadow-[0_25px_50px_rgba(0,0,0,0.4)] backdrop-blur-[10px] text-center">
            <p className="text-[2.5em] mb-[15px]">🎉</p>
            <p className="text-[#ECFDF5] text-[1.4em] font-bold mb-[20px]">
              Your pet grew!
            </p>
            <div className="bg-black/20 rounded-[15px] p-[20px] mb-[20px]">
              <p className="text-[#D1FAE5] text-[1.1em] mb-[10px]">
                <span className="font-bold">{petGrowth.pet_name}</span>
              </p>
              <p className="text-[#D1FAE5] text-[1em] mb-[8px]">
                Stage: <span className="font-bold capitalize">{petGrowth.evolution_stage}</span>
              </p>
              <p className="text-[#D1FAE5] text-[1em]">
                Level: <span className="font-bold">{petGrowth.level}</span> · XP: <span className="font-bold">{petGrowth.xp}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/pet')}
              className="bg-gradient-to-br from-[#059669] to-[#047857] text-white border-none py-3 px-[30px] rounded-[20px] text-[1em] font-bold cursor-pointer transition-all duration-300 w-full hover:scale-105 hover:shadow-[0_10px_25px_rgba(16,185,129,0.4)]"
            >
              View Chotuu
            </button>
          </div>
        </div>
      )}



      {showFoodFeeding && (
        <div className="story-reader-fullscreen-overlay fixed inset-0 flex items-center justify-center z-[200] p-5">
          <div className="story-reader-modal-container rounded-[20px] p-[25px] max-w-[380px] border-2 border-[rgba(255,107,158,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center">
            <h2 className="text-[#FF6B9E] text-[1.4em] mb-[15px] font-bold">
              🐲 Feed Chotuu!
            </h2>
            
            <div className="mb-[20px] flex justify-center">
              <DotLottieReact
                src="https://lottie.host/ede28d81-acb0-4fe9-a9df-42f14c67ae4a/BEyZkJV2Ug.lottie"
                loop
                autoplay
                className="w-[180px] h-[180px]"
              />
            </div>

            <p className="text-[#E0E0E0] mb-[20px] text-[0.95em]">
              Choose a food:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-[20px]">
              {foodOptions.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleFoodSelected(food.id)}

                  className={`relative rounded-xl overflow-hidden transition-all duration-300 border-[2.5px] ${
                    selectedFood === food.id 
                      ? 'border-[#FF6B9E] scale-[1.08] shadow-[0_0_20px_rgba(255,107,158,0.5)] bg-[rgba(255,107,158,0.1)]' 
                      : 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)]'
                  } ${
                    loading || selectedFood !== null 
                      ? 'cursor-not-allowed' 
                      : 'cursor-pointer hover:scale-110 hover:shadow-[0_0_15px_rgba(255,107,158,0.3)]'
                  } ${
                    loading && selectedFood !== food.id ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  <img
                    src={food.image}
                    alt={food.name}
                    loading="lazy"
                    className="w-full h-[80px] object-cover block"
                  />
                </div>
              ))}
            </div>

            {selectedFood && (
              <div className="relative mt-[15px] flex justify-center">
                <div className={`bg-gradient-to-br from-[#FF6B9E] to-[#FF85B8] text-white py-3 px-6 rounded-[25px] text-[0.95em] font-bold shadow-[0_8px_20px_rgba(255,107,158,0.4)] relative ${loading ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}>
                  {loading ? '🦉 Om nom nom... ✨' : '✓ Yummy!'}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#FF6B9E]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <WordTooltipPanel state = {tooltipState} onClose ={closeTooltip} />
    </>
  );
};

export default StoryReader;
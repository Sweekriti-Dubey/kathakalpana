import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, CheckCircle, Sparkles } from 'lucide-react';
import { PetStatus, Story } from '../types';
import { supabase } from '../lib/supabaseClient';

const StoryReader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story as Story;
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petGrowth, setPetGrowth] = useState<PetStatus | null>(null);
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const completeUrl = `${functionsBaseUrl}/complete-reading`;
  const petStatusUrl = `${functionsBaseUrl}/pet-status`;

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

  const handleFinish = async () => {
    if (!functionsBaseUrl) {
      setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      await axios.post(
        completeUrl, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const petRes = await axios.get(petStatusUrl, {
        headers: { Authorization: `Bearer ${token}` }
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Progress Bar Container */}
      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flip Book Chapter Card */}
      <div className="relative" style={{ perspective: '1600px' }}>
        <div className="absolute inset-y-4 -left-1 w-6 rounded-l-2xl bg-black/30 blur-sm" />
        <div className="absolute inset-y-4 -right-1 w-6 rounded-r-2xl bg-black/30 blur-sm" />

        <div
          key={currentPage}
          className={`bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-sm transition-all duration-500 ease-out animate-in ${flipDirection === 'next' ? 'fade-in slide-in-from-right-4' : 'fade-in slide-in-from-left-4'}`}
        >
          <div className="space-y-6">
            <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">
              Chapter {currentPage + 1}
            </span>
            {story.chapters[currentPage].image_url && (
              <img
                src={story.chapters[currentPage].image_url}
                alt={`${story.chapters[currentPage].title} illustration`}
                className="w-full rounded-2xl border border-neutral-800"
              />
            )}
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              {story.chapters[currentPage].title}
            </h2>
            <p className="text-lg md:text-xl text-neutral-300 leading-relaxed font-light first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-purple-500">
              {story.chapters[currentPage].content}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-4">
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
        <div className="ml-auto max-w-sm bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-3">
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

      {/* Moral Section (Only shown on last page) */}
      {currentPage === totalChapters - 1 && (
        <div className="bg-purple-950/20 border border-purple-500/30 p-6 rounded-2xl text-center flex flex-col items-center gap-3">
          <Sparkles className="text-purple-400" />
          <p className="text-purple-200 italic font-medium">"{story.moral}"</p>
        </div>
      )}
    </div>
  );
};

export default StoryReader;
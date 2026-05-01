import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetStatus } from '../types';
import { requireSupabaseClient } from '../lib/supabaseClient';

const PetDashboard: React.FC = () => {
  const [pet, setPet] = useState<PetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCelebratedAdult = useRef(false);

  // Important: Triggers celebratory animation when pet evolves to adult stage. Uses canvas-confetti for engaging
  // visual feedback that reinforces achievement and motivates continued story reading to reach evolution milestones.
  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.65 }
    });
  }, []);

  useEffect(() => {
    const fetchPet = async () => {
      const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
      if (!functionsBaseUrl) {
        setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
        setLoading(false);
        return;
      }

      try {
        const statusUrl = `${functionsBaseUrl}/pet-status`;
        const supabaseClient = requireSupabaseClient();
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token ?? '';
        const res = await axios.get(statusUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPet(res.data);
      } catch (err) {
        console.error("Failed to fetch Chotuu", err);
        setError('Failed to fetch Chotuu. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchPet();
  }, []);

  // Critical: One-time celebration trigger for reaching adult evolution. Prevents duplicate celebrations via ref flag
  // even if component re-renders, ensuring confetti fires exactly once when milestone is achieved.
  useEffect(() => {
    if (pet?.evolution_stage === 'adult' && !hasCelebratedAdult.current) {
      fireConfetti();
      hasCelebratedAdult.current = true;
    }
  }, [pet?.evolution_stage, fireConfetti]);

  if (loading) return <div className="text-center py-10 animate-pulse text-brand-purple">Finding Chotuu...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;

  const getPetVisual = () => {
    if (pet?.evolution_stage === 'adult') return "🐉";
    if (pet?.evolution_stage === 'hatchling') return "🐥";
    return "🥚";
  };

  return (
    <div 
      className="card-base relative max-w-2xl mx-auto my-4 sm:my-6 md:my-10 bg-app-surface px-4 sm:px-6 md:px-12 py-6 sm:py-8 md:py-12"
    >
      {/* Gradient background */}
      <div 
        className="chotuu-gradient-overlay absolute inset-0 rounded-3xl pointer-events-none"
      />
      
      <div className="flex flex-col items-center gap-4 sm:gap-6 relative z-10">
        <div className="animate-float">
          <div className="text-6xl sm:text-7xl md:text-8xl drop-shadow-glow-purple filter saturate-150">
            {getPetVisual()}
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            {pet?.pet_name || "Chotuu"}
          </h2>
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-brand-purple/20 text-brand-purple text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-widest border border-brand-purple/30">
            {pet?.evolution_stage} Stage
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-6 sm:mt-8">
        <div className="pet-stat-card bg-neutral-900/50 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border border-neutral-800 flex items-center gap-2 sm:gap-3">
          <Trophy className="text-yellow-500 flex-shrink-0" size={16} />
          <div>
            <p className="text-[8px] sm:text-[10px] text-neutral-500 uppercase font-bold">Level</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-white">{pet?.level}</p>
          </div>
        </div>
        <div className="pet-stat-card bg-neutral-900/50 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border border-neutral-800 flex items-center gap-2 sm:gap-3">
          <Flame className="text-orange-500 flex-shrink-0" size={16} />
          <div>
            <p className="text-[8px] sm:text-[10px] text-neutral-500 uppercase font-bold">XP</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-white">{pet?.xp}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 space-y-1.5 sm:space-y-2">
        <div className="flex justify-between text-[10px] sm:text-xs font-bold">
          <span className="text-neutral-400">Progress to Level {Number(pet?.level || 1) + 1}</span>
          <span className="text-brand-pink">{Math.min(((pet?.level || 1) - 1) * 20 + ((pet?.xp || 0) % 100) / 5, 100).toFixed(0)}%</span>
        </div>
        <div className="pet-xp-bar-bg w-full h-2 sm:h-3 rounded-full overflow-hidden p-[1px] sm:p-[2px]">
          <div 
            className="h-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-full transition-all duration-1000 shadow-glow-pink"
            style={{ width: `${Math.min(((pet?.level || 1) - 1) * 20 + ((pet?.xp || 0) % 100) / 5, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 sm:mt-8 flex justify-center">
        <button
          onClick={fireConfetti}
          className="button text-xs sm:text-sm md:text-base px-4 sm:px-6 md:px-8 py-2 sm:py-3"
        >
          <Sparkles size={12} className="sm:w-4 sm:h-4" /> View Chotuu's Gallery
        </button>
      </div>
    </div>
  );
};

export default PetDashboard;
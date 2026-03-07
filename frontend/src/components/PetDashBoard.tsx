import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetStatus } from '../types';
import { supabase } from '../lib/supabaseClient';

const PetDashboard: React.FC = () => {
  const [pet, setPet] = useState<PetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCelebratedAdult = useRef(false);

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
        const { data } = await supabase.auth.getSession();
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

  useEffect(() => {
    if (pet?.evolution_stage === 'adult' && !hasCelebratedAdult.current) {
      fireConfetti();
      hasCelebratedAdult.current = true;
    }
  }, [pet?.evolution_stage, fireConfetti]);

  if (loading) return <div className="text-center py-10 animate-pulse text-brand-purple">Finding Chotuu...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;

  // Helper to show the right emoji/asset based on evolution
  const getPetVisual = () => {
    if (pet?.evolution_stage === 'adult') return "🐉";
    if (pet?.evolution_stage === 'hatchling') return "🐥";
    return "🥚";
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-brand-card rounded-[2rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
      
      {/* 🟢 Background Glow Decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-purple/20 blur-3xl rounded-full group-hover:bg-brand-pink/30 transition-all duration-700"></div>

      {/* 🐲 THE FLOATING PET AREA */}
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="animate-float">
          <div className="text-8xl drop-shadow-glow-purple filter saturate-150">
            {getPetVisual()}
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {pet?.pet_name || "Chotuu"}
          </h2>
          <span className="px-3 py-1 bg-brand-purple/20 text-brand-purple text-xs font-bold rounded-full uppercase tracking-widest border border-brand-purple/30">
            {pet?.evolution_stage} Stage
          </span>
        </div>
      </div>

      {/* 📊 STATS GRID */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex items-center gap-3">
          <Trophy className="text-yellow-500" size={20} />
          <div>
            <p className="text-[10px] text-neutral-500 uppercase font-bold">Level</p>
            <p className="text-xl font-bold text-white">{pet?.level}</p>
          </div>
        </div>
        <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex items-center gap-3">
          <Flame className="text-orange-500" size={20} />
          <div>
            <p className="text-[10px] text-neutral-500 uppercase font-bold">XP</p>
            <p className="text-xl font-bold text-white">{pet?.xp}</p>
          </div>
        </div>
      </div>

      {/* 📉 PROGRESS BAR (XP to Next Level) */}
      <div className="mt-8 space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-neutral-400">Progress to Level {Number(pet?.level || 1) + 1}</span>
          <span className="text-brand-pink">{(pet?.xp || 0) % 100}%</span>
        </div>
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden p-[2px]">
          <div 
            className="h-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-full transition-all duration-1000 shadow-glow-pink"
            style={{ width: `${(pet?.xp || 0) % 100}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
         <button
           onClick={fireConfetti}
           className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white transition-colors"
         >
           <Sparkles size={14} /> View Chotuu's Gallery
         </button>
      </div>
    </div>
  );
};

export default PetDashboard;
import React, { useEffect, useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { Clock, Gamepad2 } from 'lucide-react';

const ScreenTimeTracker: React.FC = () => {
  const { currentProfile } = useProfile();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!currentProfile || currentProfile.profile_type !== 'kid') {
      setIsBlocked(false);
      return;
    }

    const screenTimeLimitMinutes = currentProfile.kid_settings?.[0]?.screen_time_limits?.mon?.max || 60;
    const limitMs = screenTimeLimitMinutes * 60 * 1000;
    
    const today = new Date().toDateString();
    const storageKey = `screenTime_${currentProfile.profile_id}_${today}`;

    const spentToday = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    if (spentToday >= limitMs) {
      setIsBlocked(true);
      return;
    }

    setIsBlocked(false);
    setTimeLeft(Math.max(0, limitMs - spentToday));

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      const currentSpent = parseInt(localStorage.getItem(storageKey) || '0', 10);
      const newSpent = currentSpent + delta;
      localStorage.setItem(storageKey, newSpent.toString());

      const remaining = limitMs - newSpent;
      setTimeLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        setIsBlocked(true);
        clearInterval(interval);
      }
    }, 5000); // Check and save every 5 seconds

    return () => clearInterval(interval);
  }, [currentProfile]);

  if (isBlocked && currentProfile?.profile_type === 'kid') {
    return (
      <div className="fixed inset-0 z-[9999] bg-app-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="bg-app-surface border border-app-pink/30 p-12 rounded-3xl max-w-lg shadow-[0_0_50px_rgba(255,107,158,0.2)]">
          <Gamepad2 size={64} className="mx-auto text-app-pink mb-6" />
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-app-pink to-app-violet font-playfair mb-4">
            Time for a Sweet Break! 🌟
          </h1>
          <p className="text-app-text text-lg mb-8">
            You've reached your screen limit for today! Great job reading so much. It's time to rest your eyes, play outside, or draw a picture of your favorite story!
          </p>
          <p className="text-app-muted text-sm flex items-center justify-center gap-2">
            <Clock size={16} /> See you tomorrow for more adventures!
          </p>
        </div>
      </div>
    );
  }

  if (timeLeft !== null && timeLeft > 0 && timeLeft < 5 * 60 * 1000 && currentProfile?.profile_type === 'kid') {
    return (
      <div className="fixed top-24 right-4 z-[9000] bg-red-500/90 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-pulse text-sm">
        <Clock size={16} />
        {Math.ceil(timeLeft / 60000)} mins left!
      </div>
    );
  }

  return null;
};

export default ScreenTimeTracker;

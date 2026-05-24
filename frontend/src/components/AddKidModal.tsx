import React, { useState } from 'react';
import { useProfile, CreateKidData } from '../contexts/ProfileContext';

interface AddKidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddKidModal: React.FC<AddKidModalProps> = ({ isOpen, onClose }) => {
  const { createKidProfile } = useProfile();
  
  const [kidName, setKidName] = useState('');
  const [kidAgeRange, setKidAgeRange] = useState<'3-5' | '6-8' | '9-12' | ''>('');
  const [screenTimeLimit, setScreenTimeLimit] = useState<number>(60);
  const [dailyGoal, setDailyGoal] = useState<number>(2);
  const [petName, setPetName] = useState('Chotuu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!kidName.trim() || !kidAgeRange) {
      setError('Please enter both name and age range.');
      return;
    }
    if (screenTimeLimit < 15 || dailyGoal < 1) {
      setError('Please set valid goals.');
      return;
    }

    setLoading(true);
    const result = await createKidProfile({
      name: kidName,
      age_range: kidAgeRange,
      screen_time_limit: screenTimeLimit,
      daily_story_goal: dailyGoal,
      pet_name: petName || 'Chotuu',
    });
    setLoading(false);

    if (result.success) {

      setKidName('');
      setKidAgeRange('');
      setScreenTimeLimit(60);
      setDailyGoal(2);
      setPetName('Chotuu');
      onClose();
    } else {
      setError(result.error || 'Failed to add kid profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-scrollSlideFromRight max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Add a new Kid Profile 🧒</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-app-muted ml-1 mb-1.5 block">Kid's Name</label>
              <input
                type="text"
                placeholder="First name"
                value={kidName}
                onChange={(e) => setKidName(e.target.value)}
                className="input-auth w-full text-white"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-muted ml-1 mb-2 block">Age Range (for AI stories)</label>
              <div className="grid grid-cols-3 gap-3">
                {['3-5', '6-8', '9-12'].map((age) => (
                  <button
                    type="button"
                    key={age}
                    onClick={() => setKidAgeRange(age as any)}
                    className={`py-2 rounded-xl border-2 transition-all font-semibold ${
                      kidAgeRange === age 
                        ? 'border-app-pink bg-app-pink/10 text-app-pink' 
                        : 'border-app-border text-app-muted hover:border-app-pink/50 hover:bg-app-surface'
                    }`}
                  >
                    {age} yrs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-app-border/30 p-4 rounded-2xl border border-app-border">
              <label className="text-sm font-medium text-app-muted block mb-3">Daily Screen Time</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="15" max="180" step="15"
                  value={screenTimeLimit}
                  onChange={(e) => setScreenTimeLimit(Number(e.target.value))}
                  className="w-full accent-app-violet"
                />
                <span className="font-bold text-app-violet text-sm w-12 text-right">{screenTimeLimit}m</span>
              </div>
            </div>

            <div className="bg-app-border/30 p-4 rounded-2xl border border-app-border">
              <label className="text-sm font-medium text-app-muted block mb-3">Daily Goal</label>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setDailyGoal(Math.max(1, dailyGoal - 1))} className="w-8 h-8 rounded-full bg-app-surface border border-app-border hover:border-app-pink flex items-center justify-center font-bold text-white">-</button>
                <span className="font-bold text-app-pink">{dailyGoal} <span className="text-xs text-app-muted">stories</span></span>
                <button type="button" onClick={() => setDailyGoal(Math.min(10, dailyGoal + 1))} className="w-8 h-8 rounded-full bg-app-surface border border-app-border hover:border-app-pink flex items-center justify-center font-bold text-white">+</button>
              </div>
            </div>
          </div>

          {}
          <div>
            <label className="text-sm font-medium text-app-muted ml-1 mb-1.5 block">Companion Pet Name</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-app-border/30 flex items-center justify-center text-2xl">🥚</div>
              <input
                type="text"
                placeholder="e.g. Chotuu"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="input-auth flex-1 text-white"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-6 py-3 rounded-xl font-semibold text-app-muted border border-app-border hover:bg-white/5 transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-app-violet to-app-pink text-white py-3 rounded-xl font-bold shadow-lg shadow-app-violet/20 hover:-translate-y-0.5 transition-all disabled:opacity-70">
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddKidModal;

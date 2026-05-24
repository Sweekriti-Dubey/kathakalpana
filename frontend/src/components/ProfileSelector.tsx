import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Lock } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import type { Profile } from '../types';
import AddKidModal from './AddKidModal';
import netflixLogo from '../assets/images/netflix.png';

const colors = [
  'linear-gradient(135deg, #ef4444, #7f1d1d)', // Red
  'linear-gradient(135deg, #3b82f6, #1e3a8a)', // Blue
  'linear-gradient(135deg, #10b981, #064e3b)', // Green
  'linear-gradient(135deg, #f59e0b, #78350f)', // Yellow
  'linear-gradient(135deg, #8b5cf6, #4c1d95)', // Purple
];
const getProfileColor = (index: number) => colors[index % colors.length];

const ProfileSelector: React.FC = () => {
  const { availableProfiles, switchProfile, closeSelector, currentProfile } = useProfile();
  const navigate = useNavigate();
  const [isAddKidModalOpen, setIsAddKidModalOpen] = useState(false);
  
  const [pinModalProfile, setPinModalProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleSelect = (profile: Profile): void => {
    if (profile.profile_type === 'parent') {
      setPinModalProfile(profile);
      setPinInput('');
      setPinError('');
    } else {
      switchProfile(profile.profile_id);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Selected Profile Data:", pinModalProfile);
    
    let correctPin = '0000';
    if (pinModalProfile?.parent_account) {
      if (Array.isArray(pinModalProfile.parent_account)) {
        correctPin = pinModalProfile.parent_account[0]?.parental_gate_hash || '0000';
      } else {

        correctPin = pinModalProfile.parent_account?.parental_gate_hash || '0000';
      }
    }
    
    if (correctPin === pinInput) {
      switchProfile(pinModalProfile!.profile_id);
      setPinModalProfile(null);
      navigate('/parent');
    } else {
      setPinError('Incorrect PIN');
      setPinInput('');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(19,17,32,0.97) 0%, rgba(11,11,18,0.99) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {}
        <div
          className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6), transparent)' }}
        />
        <div
          className="absolute bottom-[15%] right-[10%] w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,95,160,0.5), transparent)' }}
        />

        <div className="relative z-10 text-center px-6 max-w-3xl w-full">
          {}
          <div className="mb-4">

            <h1
              className="text-4xl md:text-5xl font-playfair font-black mb-3"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #ff5fa0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Who is reading today?
            </h1>
            <p className="text-app-muted text-sm md:text-base">
              Select your profile to continue
            </p>
          </div>

          {}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {availableProfiles.map((profile, index) => (
              <button
                key={profile.profile_id}
                onClick={() => handleSelect(profile)}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-transparent transition-all duration-300 hover:border-app-violet/40 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-app-violet/50 w-36 md:w-44"
                style={{
                  background: 'rgba(26,26,46,0.6)',
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {}
                <div className="relative">
                  <div
                    className="w-24 h-24 md:w-32 md:h-32 rounded flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border-4 group-hover:border-white border-transparent shadow-lg"
                    style={{ background: getProfileColor(index) }}
                  >
                    <img src={netflixLogo} alt="Profile" className="w-12 h-12 md:w-16 md:h-16 object-contain opacity-90 drop-shadow-md" />
                  </div>
                  {}
                  {currentProfile?.profile_id === profile.profile_id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-app-green border-2 border-[#0b0b12]" />
                  )}
                </div>

                {}
                <div className="text-center">
                  <span className="text-sm md:text-base font-semibold text-app-text group-hover:text-white transition-colors block">
                    {profile.name}
                  </span>
                  {}
                </div>

                {}
                <div className="flex gap-2">
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                      profile.profile_type === 'parent'
                        ? 'bg-app-violet/20 text-app-violet'
                        : 'bg-app-pink/20 text-app-pink'
                    }`}
                  >
                    {profile.profile_type === 'parent' && <Lock size={10} />}
                    {profile.profile_type}
                  </span>
                  
                  {profile.profile_type === 'kid' && profile.kid_profiles?.[0]?.age_range && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      {profile.kid_profiles[0].age_range} yrs
                    </span>
                  )}
                </div>
              </button>
            ))}
            
            {}
            <button
              onClick={() => setIsAddKidModalOpen(true)}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-transparent transition-all duration-300 hover:border-app-pink/40 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-app-pink/50 w-36 md:w-44"
              style={{
                background: 'rgba(26,26,46,0.6)',
                animationDelay: `${availableProfiles.length * 100}ms`,
              }}
            >
              <div className="relative">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl transition-transform duration-300 group-hover:scale-110 border border-dashed border-app-pink/40 text-app-pink/60 group-hover:text-app-pink"
                  style={{ background: 'rgba(255,95,160,0.05)' }}
                >
                  <Plus size={40} />
                </div>
              </div>
              <span className="text-sm md:text-base font-semibold text-app-muted group-hover:text-white transition-colors">
                Add Kid
              </span>
            </button>
          </div>

        </div>
      </div>

      <AddKidModal 
        isOpen={isAddKidModalOpen} 
        onClose={() => setIsAddKidModalOpen(false)} 
      />

      {}
      {pinModalProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-scrollSlideFromRight">
            <h2 className="text-xl font-bold text-white mb-2 text-center">Parent Access</h2>
            <p className="text-app-muted text-sm mb-6 text-center">Enter your 4-digit PIN</p>
            
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                inputMode="numeric"
                style={{ WebkitTextSecurity: 'disc' }}
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="input-auth text-center text-2xl tracking-[1em] py-4"
                autoFocus
                autoComplete="off"
              />
              {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
              
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setPinModalProfile(null)} className="px-6 py-3 rounded-xl font-semibold text-app-muted border border-app-border hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-app-violet to-app-pink text-white py-3 rounded-xl font-bold shadow-lg shadow-app-violet/20 hover:-translate-y-0.5 transition-all">
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileSelector;

import React, { useEffect, useMemo, useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { useProfile, SetupAccountData } from '../contexts/ProfileContext';

interface LoginProps {
  onLogin: (session: any) => void;
}

type AuthView = 'login' | 'signup' | 'forgot' | 'reset' 
  | 'onboard-welcome' | 'onboard-kid' | 'onboard-screentime' | 'onboard-pet';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [parentName, setParentName] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [kidName, setKidName] = useState('');
  const [kidAgeRange, setKidAgeRange] = useState<'3-5' | '6-8' | '9-12' | ''>('');
  const [screenTimeLimit, setScreenTimeLimit] = useState<number>(60);
  const [dailyGoal, setDailyGoal] = useState<number>(2);
  const [petName, setPetName] = useState('Chotuu');

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const client = useMemo(() => requireSupabaseClient(), []);
  const { setupAccount, needsOnboarding, availableProfiles, refreshProfiles } = useProfile();

  const baseUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined)
    ?.trim()
    ?.replace(/\/$/, '') ?? '';

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const fromQueryMode = query.get('mode');
    const fromQueryType = query.get('type');
    const fromHashType = hash.get('type');

    if (fromQueryMode === 'reset' || fromQueryType === 'recovery' || fromHashType === 'recovery') {
      setView('reset');
      setSuccess('You can now set a new password.');
      setError('');
    }

    const { data: authListener } = client.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
        setSuccess('Recovery link verified. Set your new password below.');
        setError('');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (needsOnboarding && (view === 'login' || view === 'signup')) {
      setView('onboard-welcome');
    }
  }, [needsOnboarding, view]);

  useEffect(() => {
    if (availableProfiles.length > 0 && !needsOnboarding) {
      navigate('/');
    }
  }, [availableProfiles, needsOnboarding, navigate]);

  const validatePassword = (value: string): string => {
    if (value.length < 6) return 'Password must be at least 6 characters long.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character.';
    return '';
  };

  const resetMessages = (): void => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (view === 'login') {
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;

        if (baseUrl && data.session) {
          try {
            const res = await axios.get(`${baseUrl}/get-profiles`, {
              headers: { Authorization: `Bearer ${data.session.access_token}` }
            });
            onLogin(data.session);
            
            if (res.data.length === 0) {
              setView('onboard-welcome');
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Failed to check profiles during login', err);
            onLogin(data.session);
          }
        } else {
          onLogin(data.session ?? null);
        }
        
        navigate('/'); // Go to profile selector

      } else if (view === 'signup') {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          onLogin(data.session);
          setView('onboard-welcome');
        } else {
          setView('login');
          setPassword('');
          setSuccess('Account created. Please verify your email if required, then log in.');
        }

      } else if (view === 'forgot') {
        const redirectTo = `${window.location.origin}/login?mode=reset`;
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetError) throw resetError;
        setSuccess('Password reset link sent. Check your email inbox.');

      } else if (view === 'reset') {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) throw updateError;

        setPassword('');
        setConfirmPassword('');
        setView('login');
        setSuccess('Password updated successfully. Please log in with your new password.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardSubmit = async () => {
    resetMessages();
    setLoading(true);
    
    const payload: SetupAccountData = {
      parent_name: parentName || 'Parent',
      parent_pin: parentPin || '0000',
      kid_name: kidName,
      kid_age_range: kidAgeRange as '3-5' | '6-8' | '9-12',
      screen_time_limit: screenTimeLimit,
      daily_story_goal: dailyGoal,
      pet_name: petName || 'Chotuu'
    };

    const result = await setupAccount(payload);

    try {
      if (result.success && parentPin) {
        const { data: userData } = await client.auth.getUser();
        if (userData?.user) {
          const { data: profileData } = await client
            .from('profiles_v2')
            .select('profile_id')
            .eq('user_id', userData.user.id)
            .eq('profile_type', 'parent')
            .maybeSingle();
            
          if (profileData) {
            await client
              .from('parent_account')
              .upsert({ 
                profile_id: profileData.profile_id, 
                parental_gate_hash: parentPin 
              }, { onConflict: 'profile_id' });
          }
        }

        if (refreshProfiles) {
          await refreshProfiles();
        }
      }
    } catch (err) {
      console.warn('Fallback PIN save failed:', err);
    }
    
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Account setup failed. Please try again.');
    }
  };

  const nextStep = (nextView: AuthView) => {
    resetMessages();
    if (view === 'onboard-welcome') {
      if (!parentName.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (!/^\d{4}$/.test(parentPin)) {
        setError('Please enter a valid 4-digit PIN.');
        return;
      }
    }
    if (view === 'onboard-kid' && (!kidName.trim() || !kidAgeRange)) {
      setError('Please enter both name and age range.');
      return;
    }
    if (view === 'onboard-screentime' && (screenTimeLimit < 15 || dailyGoal < 1)) {
      setError('Please set valid goals.');
      return;
    }
    setView(nextView);
  };

  const renderDots = (step: number) => (
    <div className="flex justify-center gap-2 mt-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === step ? 'bg-app-pink' : 'bg-app-border'}`} />
      ))}
    </div>
  );

  const isAuthView = ['login', 'signup', 'forgot', 'reset'].includes(view);

  if (isAuthView) {
    const isLoginView = view === 'login';
    const isSignupView = view === 'signup';
    const isForgotView = view === 'forgot';
    const isResetView = view === 'reset';

    const title = isLoginView ? 'Welcome Back!' : isSignupView ? 'Join Katha Kalpana' : isForgotView ? 'Forgot Password' : 'Set a New Password';
    const submitText = isLoginView ? 'Log In' : isSignupView ? 'Sign Up' : isForgotView ? 'Send Reset Link' : 'Update Password';

    return (
      <div className="text-center py-12 px-6 text-white">
        <div className="w-full max-w-md mx-auto p-8 bg-app-surface rounded-2xl shadow-xl border border-app-border">
          <h2 className="text-2xl font-bold mb-6 font-playfair">{title}</h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isResetView && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-auth"
              />
            )}

            {!isForgotView && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-auth"
              />
            )}

            {(isSignupView || isResetView) && (
              <>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-auth"
                />
                <p className="text-app-muted text-xs text-left mt-1">Use at least 6 characters, including one uppercase, lowercase, and special character.</p>
              </>
            )}
            
            {error && <p className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</p>}
            {success && <p className="text-green-400 text-sm bg-green-500/10 p-2 rounded">{success}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-gradient-to-br from-app-violet to-app-pink text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : submitText}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-app-muted text-sm">
            {(isLoginView || isSignupView) && (
              <p>
                {isLoginView ? 'New here? ' : 'Already have an account? '}
                <button onClick={() => { resetMessages(); setView(isLoginView ? 'signup' : 'login'); }} className="text-app-pink font-semibold hover:underline">
                  {isLoginView ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            )}

            {(isLoginView || isSignupView) && (
              <p>
                <button onClick={() => { resetMessages(); setView('forgot'); }} className="text-app-violet hover:underline">
                  Forgot password?
                </button>
              </p>
            )}

            {(isForgotView || isResetView) && (
              <p>
                <button onClick={() => { resetMessages(); setView('login'); }} className="text-app-pink font-semibold hover:underline">
                  Back to login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 text-white min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-app-surface rounded-3xl p-8 shadow-2xl border border-app-border relative overflow-hidden transition-all duration-500">
        
        {view === 'onboard-welcome' && (
          <div className="animate-scrollSlideFromRight">
            <h2 className="text-3xl font-playfair font-bold text-center mb-2">Welcome! 🌟</h2>
            <p className="text-app-muted text-center mb-8">Where imagination meets reality. Let's get your family set up.</p>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-medium text-app-muted ml-1 mb-1.5 block">What should we call you? (Parent's Name)</label>
                <input
                  type="text"
                  placeholder="e.g. Mom, Dad, Sarah..."
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="input-auth text-lg py-3"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-app-muted ml-1 mb-1.5 block">Admin Passcode (4-digits)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  style={{ WebkitTextSecurity: 'disc' }}
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={parentPin}
                  onChange={(e) => setParentPin(e.target.value.replace(/\D/g, ''))}
                  className="input-auth text-lg py-3 tracking-widest text-center"
                  autoComplete="off"
                />
                <p className="text-xs text-app-muted ml-1 mt-1">Used to access the Parent Dashboard and settings.</p>
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            
            <button onClick={() => nextStep('onboard-kid')} className="w-full mt-8 bg-app-violet text-white py-3.5 rounded-xl font-bold shadow-lg shadow-app-violet/20 hover:-translate-y-1 transition-all active:scale-95">
              Next
            </button>
            {renderDots(1)}
          </div>
        )}

        {view === 'onboard-kid' && (
          <div className="animate-scrollSlideFromRight">
            <h2 className="text-2xl font-bold text-center mb-6">Let's set up a profile for your kid 🧒</h2>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-medium text-app-muted ml-1 mb-1.5 block">Kid's Name</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  className="input-auth"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-app-muted ml-1 mb-2 block">Age Range (for AI stories)</label>
                <div className="grid grid-cols-3 gap-3">
                  {['3-5', '6-8', '9-12'].map((age) => (
                    <button
                      key={age}
                      onClick={() => setKidAgeRange(age as any)}
                      className={`py-3 rounded-xl border-2 transition-all font-semibold ${
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

            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setView('onboard-welcome')} className="px-6 py-3.5 rounded-xl font-semibold text-app-muted border border-app-border hover:bg-white/5 transition-all">Back</button>
              <button onClick={() => nextStep('onboard-screentime')} className="flex-1 bg-app-pink text-white py-3.5 rounded-xl font-bold shadow-lg shadow-app-pink/20 hover:-translate-y-1 transition-all">Next</button>
            </div>
            {renderDots(2)}
          </div>
        )}

        {view === 'onboard-screentime' && (
          <div className="animate-scrollSlideFromRight">
            <h2 className="text-2xl font-bold text-center mb-6">Healthy Habits ⏱️</h2>
            
            <div className="flex flex-col gap-6">
              <div className="bg-app-border/30 p-5 rounded-2xl border border-app-border">
                <label className="text-sm font-medium text-app-muted block mb-3">Daily Screen Time Limit</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="15" max="180" step="15"
                    value={screenTimeLimit}
                    onChange={(e) => setScreenTimeLimit(Number(e.target.value))}
                    className="w-full accent-app-violet"
                  />
                  <span className="font-bold text-lg text-app-violet w-16 text-right">{screenTimeLimit}m</span>
                </div>
              </div>

              <div className="bg-app-border/30 p-5 rounded-2xl border border-app-border">
                <label className="text-sm font-medium text-app-muted block mb-3">Daily Story Goal</label>
                <div className="flex items-center gap-4 justify-between">
                  <button onClick={() => setDailyGoal(Math.max(1, dailyGoal - 1))} className="w-10 h-10 rounded-full bg-app-surface border border-app-border hover:border-app-pink flex items-center justify-center font-bold text-xl">-</button>
                  <span className="font-bold text-2xl text-app-pink">{dailyGoal} <span className="text-sm font-medium text-app-muted">stories</span></span>
                  <button onClick={() => setDailyGoal(Math.min(10, dailyGoal + 1))} className="w-10 h-10 rounded-full bg-app-surface border border-app-border hover:border-app-pink flex items-center justify-center font-bold text-xl">+</button>
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setView('onboard-kid')} className="px-6 py-3.5 rounded-xl font-semibold text-app-muted border border-app-border hover:bg-white/5 transition-all">Back</button>
              <button onClick={() => nextStep('onboard-pet')} className="flex-1 bg-app-gold text-black py-3.5 rounded-xl font-bold shadow-lg shadow-app-gold/20 hover:-translate-y-1 transition-all">Next</button>
            </div>
            {renderDots(3)}
          </div>
        )}

        {view === 'onboard-pet' && (
          <div className="animate-scrollSlideFromRight">
            <h2 className="text-2xl font-bold text-center mb-6">Meet the Companion 🥚</h2>
            <p className="text-app-muted text-center mb-6 text-sm leading-relaxed">
              Every kid gets a virtual pet that grows as they read. What should we call it?
            </p>
            
            <div className="flex flex-col gap-4 items-center">
              <div className="w-24 h-24 rounded-full bg-app-surface border-4 border-app-green flex items-center justify-center text-4xl shadow-xl shadow-app-green/20 mb-2">
                🥚
              </div>
              <input
                type="text"
                placeholder="e.g. Chotuu, Sparky..."
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="input-auth text-center text-lg font-bold"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setView('onboard-screentime')} disabled={loading} className="px-6 py-3.5 rounded-xl font-semibold text-app-muted border border-app-border hover:bg-white/5 transition-all">Back</button>
              <button onClick={handleOnboardSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-app-green to-emerald-400 text-black py-3.5 rounded-xl font-bold shadow-lg shadow-app-green/30 hover:-translate-y-1 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? 'Setting up...' : 'Finish Setup ✨'}
              </button>
            </div>
            {renderDots(4)}
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requireSupabaseClient } from '../lib/supabaseClient';

function Login({ onLogin }) {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordHint = 'Use at least 6 characters, including one uppercase letter, one lowercase letter, and one special character.';

  const client = useMemo(() => requireSupabaseClient(), []);

  // Important: Handles password recovery flows both from URL params and auth state changes.
  // Detects recovery links and PASSWORD_RECOVERY events to automatically navigate to reset view.
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

    const { data: authListener } = client.auth.onAuthStateChange((event) => {
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

  // Important: Enforces password security standards (6+ chars, uppercase, lowercase, special char).
  // Prevents weak passwords that increase account compromise risk and improves user safety.
  const validatePassword = (value) => {
    if (value.length < 6) return 'Password must be at least 6 characters long.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character.';
    return '';
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  // Critical: Multi-step auth flow handler supporting login, signup, password reset, and password change.
  // Integrates with Supabase Auth for secure credential management. Handles different flows based on view state
  // to guide users through appropriate authentication steps with clear success/error messaging.
  const handleSubmit = async (e) => {
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
        onLogin(data.session ?? null);
        navigate('/generate');
      } else if (view === 'signup') {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { error: signUpError } = await client.auth.signUp({
          email,
          password
        });

        if (signUpError) throw signUpError;
        setView('login');
        setPassword('');
        setSuccess('Account created. Please verify your email if required, then log in.');
      } else if (view === 'forgot') {
        const redirectTo = `${window.location.origin}/login?mode=reset`;
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetError) throw resetError;
        setSuccess('Password reset link sent. Check your email inbox.');
      } else if (view === 'reset') {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) throw updateError;

        setPassword('');
        setConfirmPassword('');
        setView('login');
        setSuccess('Password updated successfully. Please log in with your new password.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const isLoginView = view === 'login';
  const isSignupView = view === 'signup';
  const isForgotView = view === 'forgot';
  const isResetView = view === 'reset';

  const title = isLoginView
    ? 'Welcome Back!'
    : isSignupView
      ? 'Join Story Buddy'
      : isForgotView
        ? 'Forgot Password'
        : 'Set a New Password';

  const submitText = isLoginView
    ? 'Log In'
    : isSignupView
      ? 'Sign Up'
      : isForgotView
        ? 'Send Reset Link'
        : 'Update Password';

  return (
    <div className="auth-container" style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
      <div className="auth-box" style={{ maxWidth: '400px', margin: 'auto', padding: '30px', background: '#2a2a2a', borderRadius: '15px' }}>
        <h2>{title}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isResetView && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '10px', borderRadius: '5px' }}
            />
          )}

          {!isForgotView && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '10px', borderRadius: '5px' }}
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
                style={{ padding: '10px', borderRadius: '5px' }}
              />
              <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '-6px' }}>{passwordHint}</p>
            </>
          )}
          
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
          {success && <p style={{ color: '#7ef0a8' }}>{success}</p>}
          
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '10px', padding: '10px', cursor: 'pointer', background: '#4facfe', border: 'none', color: 'white', borderRadius: '5px' }}
          >
            {loading ? 'Please wait...' : submitText}
          </button>
        </form>

        <div style={{ marginTop: '20px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(isLoginView || isSignupView) && (
            <p>
              {isLoginView ? 'New here? ' : 'Already have an account? '}
              <span
                onClick={() => {
                  resetMessages();
                  setView(isLoginView ? 'signup' : 'login');
                }}
                style={{ color: '#4facfe', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLoginView ? 'Sign Up' : 'Log In'}
              </span>
            </p>
          )}

          {(isLoginView || isSignupView) && (
            <p>
              <span
                onClick={() => {
                  resetMessages();
                  setView('forgot');
                }}
                style={{ color: '#4facfe', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Forgot password?
              </span>
            </p>
          )}

          {(isForgotView || isResetView) && (
            <p>
              <span
                onClick={() => {
                  resetMessages();
                  setView('login');
                }}
                style={{ color: '#4facfe', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Back to login
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
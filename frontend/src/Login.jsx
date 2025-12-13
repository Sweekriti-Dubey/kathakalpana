import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

  
    const endpoint = isLoginMode 
      ? 'https://kathakalpana-api.onrender.com/login' 
      : 'https://kathakalpana-api.onrender.com/signup';

    try {
      if (isLoginMode) {
      
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await axios.post(endpoint, formData);
        
        onLogin(response.data.access_token);
        navigate('/generate'); 
      } else {
        // SIGNUP: Use JSON
        await axios.post(endpoint, { email, password });
        setIsLoginMode(true); 
        alert('Account created! Please log in.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="auth-container" style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
      <div className="auth-box" style={{ maxWidth: '400px', margin: 'auto', padding: '30px', background: '#2a2a2a', borderRadius: '15px' }}>
        <h2>{isLoginMode ? 'Welcome Back!' : 'Join Story Buddy'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '5px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px' }} />
          
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
          
          <button type="submit" style={{ marginTop: '10px', padding: '10px', cursor: 'pointer', background: '#4facfe', border: 'none', color: 'white', borderRadius: '5px' }}>
            {isLoginMode ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '20px', color: '#ccc' }}>
          {isLoginMode ? "New here? " : "Already have an account? "}
          <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: '#4facfe', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoginMode ? 'Sign Up' : 'Log In'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
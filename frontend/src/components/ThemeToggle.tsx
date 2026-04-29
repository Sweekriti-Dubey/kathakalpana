import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(255,95,160,0.15))'
          : 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(59,130,246,0.15))',
        border: theme === 'dark'
          ? '1.5px solid rgba(167, 139, 250, 0.4)'
          : '1.5px solid rgba(251, 191, 36, 0.5)',
        borderRadius: '12px',
        padding: '10px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        color: theme === 'dark' ? '#a78bfa' : '#fbbf24',
        fontWeight: 600,
        fontSize: '0.9em',
      }}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 0 12px rgba(167, 139, 250, 0.3)'
          : '0 0 12px rgba(251, 191, 36, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {theme === 'dark' ? (
        <>
          <Sun size={18} style={{ animation: 'rotate 2s linear infinite' }} />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={18} style={{ animation: 'rotate 2s linear infinite reverse' }} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? (
        <>
          <Sun size={18} className="animate-spin" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={18} className="animate-spin" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;

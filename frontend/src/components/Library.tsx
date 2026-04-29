import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, TrendingUp, Star } from 'lucide-react';
import { requireSupabaseClient } from '../lib/supabaseClient';


const statCardStyles = `
  @layer components {
    .stat-card {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 0.5rem;
      background: rgba(19, 17, 32, 0.7);
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      border-color: rgba(167, 139, 250, 0.6);
      border-opacity: 1;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.5), rgba(255, 95, 160, 0.5), transparent);
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 10;
    }

    .stat-card:hover::before {
      opacity: 1;
    }

    html[data-theme="light"] .stat-card {
      background: rgba(243, 244, 248, 0.8);
      border-color: rgba(124, 58, 237, 0.3);
      box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.15);
    }

    html[data-theme="light"] .stat-card:hover {
      border-color: rgba(124, 58, 237, 0.7);
      border-opacity: 1;
    }

    html[data-theme="light"] .stat-card::before {
      background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(236, 72, 153, 0.4), transparent);
    }
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = statCardStyles;
  document.head.appendChild(styleTag);
}
interface Chapter {
  image_url?: string;
}

interface Story {
  id?: string;
  _id?: string;
  title: string;
  content?: Story;
  chapters?: Chapter[];
  created_at: string;
}

const hashStringToInt = (str: string): number => {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const positiveHash = Math.abs(hash);
  return 12 + (positiveHash % 89);
};

const Library: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const listUrl = `${functionsBaseUrl}/my-stories`;
  const navigate = useNavigate();
  const client = useMemo(() => requireSupabaseClient(), []);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async (): Promise<void> => {
    if (!functionsBaseUrl) {
      setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
      setLoading(false);
      return;
    }

    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? '';
      const response = await axios.get(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const normalized = (response.data ?? []).map((story: Story) => {
        const content = story.content ?? story;
        return {
          ...story,
          ...content,
          chapters: content.chapters ?? story.chapters ?? []
        };
      });
      setStories(normalized);
    } catch (error) {
      console.error("Error fetching library:", error);
      setError('Failed to load library. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openStory = (story: Story): void => {
    navigate('/read', { state: { story: story } });
  };

  if (loading) return <div style={{textAlign:'center', color:'white', marginTop:'50px'}}>Loading your library...</div>;
  if (error) return <div style={{textAlign:'center', color:'#ff6b6b', marginTop:'50px'}}>{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col mb-6 mt-2.5">
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.2em',
          fontWeight: 900,
          color: 'var(--text)',
          marginBottom: '4px',
        }}>My Library</h2>
        <p className="text-app-muted text-sm">Your saved stories collection</p>
      </div>

      <div className="flex gap-5 mb-11 flex-wrap">
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4 hover:shadow-2xl hover:translate-y-[-10px]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{backgroundColor: '#3b82f6'}}><BookOpen size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">{stories.length}</h3>
            <p className="text-sm text-app-muted">Total Stories</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4 hover:shadow-2xl hover:translate-y-[-10px]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{backgroundColor: '#ec4899'}}><Clock size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">45h</h3>
            <p className="text-sm text-app-muted">Reading Time</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4 hover:shadow-2xl hover:translate-y-[-10px]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{backgroundColor: '#10b981'}}><TrendingUp size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">+5</h3>
            <p className="text-sm text-app-muted">This Week</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4 hover:shadow-2xl hover:translate-y-[-10px]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{backgroundColor: '#f97316'}}><Star size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">12</h3>
            <p className="text-sm text-app-muted">Favorites</p>
          </div>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center opacity-70 py-10">No stories saved yet. Go create one!</div>
      ) : (
        <div className="grid gap-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
          {stories.map((story) => {
            const completion = hashStringToInt(story.title || '');
            const coverImage = story.chapters?.[0]?.image_url || 'https://via.placeholder.com/400x600?text=No+Cover';
            
            return (
              <div 
                key={story.id ?? story._id}
                className="relative rounded-3xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:translate-y-[-10px] hover:shadow-2xl"
                style={{ aspectRatio: '3/4' }}
                onClick={() => openStory(story)}
              >
                <div className="absolute inset-0 w-full h-full bg-app-surface">
                  <img 
                    src={coverImage} 
                    alt={`${story.title} cover`}
                    className="w-full h-full object-cover transition-transform duration-600 hover:scale-110"
                  />
                </div>
                <div className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold z-10 border border-white/30" style={{WebkitBackdropFilter: 'blur(6px)'}}>
                  <svg className="absolute w-11 h-11" viewBox="0 0 36 36" style={{transform: 'rotate(-90deg)'}}>
                    <path
                      className="fill-transparent stroke-white"
                      strokeWidth="2.5"
                      strokeDasharray={`${completion}, 100`}
                      style={{transition: 'stroke-dasharray 1s ease-out'}}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="relative z-10">{completion}%</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10 flex flex-col gap-1.5 z-10" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'}}>
                  <h4 className="text-white font-bold text-lg" style={{fontFamily: "'DM Sans', sans-serif", textShadow: '0 2px 4px rgba(0,0,0,0.5)', lineHeight: 1.3}}>{story.title}</h4>
                  <p className="text-white/85 text-xs flex items-center gap-1.5">
                    <Clock size={12} /> Saved {new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, TrendingUp, Star } from 'lucide-react';
import { requireSupabaseClient } from '../lib/supabaseClient';
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

  if (loading) return <div className="text-center text-white mt-12">Loading your library...</div>;
  if (error) return <div className="text-center text-red-500 mt-12">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col mb-6 mt-2.5">
        <h2 className="section-title text-4xl mb-1">My Library</h2>
        <p className="text-app-muted text-sm">Your saved stories collection</p>
      </div>

      <div className="flex gap-5 mb-11 flex-wrap">
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-blue-500"><BookOpen size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">{stories.length}</h3>
            <p className="text-sm text-app-muted">Total Stories</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-pink-500"><Clock size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">45h</h3>
            <p className="text-sm text-app-muted">Reading Time</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-green-500"><TrendingUp size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">+5</h3>
            <p className="text-sm text-app-muted">This Week</p>
          </div>
        </div>
        <div className="stat-card flex-1 min-w-[180px] p-8 flex flex-col gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-orange-500"><Star size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold text-app-text mb-0.5">12</h3>
            <p className="text-sm text-app-muted">Favorites</p>
          </div>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center opacity-70 py-10">No stories saved yet. Go create one!</div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stories.map((story) => {
            const completion = hashStringToInt(story.title || '');
            const coverImage = story.chapters?.[0]?.image_url || 'https://via.placeholder.com/400x600?text=No+Cover';
            
            return (
              <div 
                key={story.id ?? story._id}
                className="relative rounded-3xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:translate-y-[-10px] hover:shadow-2xl aspect-[3/4]"
                onClick={() => openStory(story)}
              >
                <div className="absolute inset-0 w-full h-full bg-app-surface">
                  <img 
                    src={coverImage} 
                    alt={`${story.title} cover`}
                    className="w-full h-full object-cover transition-transform duration-600 hover:scale-110"
                  />
                </div>
                <div className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold z-10 border border-white/30">
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
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10 flex flex-col gap-1.5 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                  <h4 className="text-white font-bold text-lg font-sans drop-shadow-md leading-tight">{story.title}</h4>
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

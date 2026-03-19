import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function Library() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const listUrl = `${functionsBaseUrl}/my-stories`;
  const navigate = useNavigate();

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    if (!functionsBaseUrl) {
      setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      const response = await axios.get(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const normalized = (response.data ?? []).map((story) => {
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

  const openStory = (story) => {
    navigate('/read', { state: { story: story } });
  };

  if (loading) return <div style={{textAlign:'center', color:'white', marginTop:'50px'}}>Loading your library...</div>;
  if (error) return <div style={{textAlign:'center', color:'#ff6b6b', marginTop:'50px'}}>{error}</div>;

  return (
    <div className="library-container" style={{padding: '40px', color: 'white'}}>
      <h2 style={{textAlign:'center', marginBottom: '30px'}}>My Story Collection</h2>
      
      {stories.length === 0 ? (
        <div style={{textAlign:'center', opacity: 0.7}}>No stories saved yet. Go create one!</div>
      ) : (
        <div className="library-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
          {stories.map((story) => (
            <div 
              key={story.id ?? story._id} 
              className="story-card" 
              onClick={() => openStory(story)}
              style={{
                background: '#2a2a2a', 
                borderRadius: '15px', 
                overflow: 'hidden', 
                padding: '20px', 
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {story.chapters?.[0]?.image_url && (
                <img
                  src={story.chapters[0].image_url}
                  alt={`${story.title} cover`}
                  style={{ width: '100%', borderRadius: '12px', marginBottom: '12px' }}
                />
              )}
              <h3 style={{marginTop: 0}}>{story.title}</h3>
              <p style={{fontSize: '0.9em', color: '#aaa'}}><Calendar size={14} /> {new Date(story.created_at).toLocaleDateString()}</p>
              
              <div style={{marginTop: '15px'}}>
                <span style={{background: 'linear-gradient(135deg, #ff5fa0, #8b5cf6)', color: 'white', padding: '10px 20px', borderRadius: '100px', fontSize: '0.8em', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-block'}}>
                  {story.chapters.length} Chapters
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Library;
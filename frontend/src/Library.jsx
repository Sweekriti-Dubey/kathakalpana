import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Calendar } from 'lucide-react';

function Library() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const response = await axios.get('https://kathakalpana-api.onrender.com/my_stories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStories(response.data);
    } catch (error) {
      console.error("Error fetching library:", error);
    } finally {
      setLoading(false);
    }
  };

  const openStory = (story) => {
    // Navigate to the Reader page and pass the story data
    navigate('/read', { state: { story: story } });
  };

  if (loading) return <div style={{textAlign:'center', color:'white', marginTop:'50px'}}>Loading your library...</div>;

  return (
    <div className="library-container" style={{padding: '40px', color: 'white'}}>
      <h2 style={{textAlign:'center', marginBottom: '30px'}}>📚 My Story Collection</h2>
      
      {stories.length === 0 ? (
        <div style={{textAlign:'center', opacity: 0.7}}>No stories saved yet. Go create one!</div>
      ) : (
        <div className="library-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
          {stories.map((story) => (
            <div 
              key={story._id} 
              className="story-card" 
              onClick={() => openStory(story)} // <--- CLICK HANDLER ADDED HERE
              style={{
                background: '#2a2a2a', 
                borderRadius: '15px', 
                overflow: 'hidden', 
                padding: '20px', 
                cursor: 'pointer', // <--- MOUSE HAND POINTER
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <h3 style={{marginTop: 0}}>{story.title}</h3>
              <p style={{fontSize: '0.9em', color: '#aaa'}}><Calendar size={14} /> {new Date(story.created_at).toLocaleDateString()}</p>
              
              {story.chapters[0]?.image && (
                <img 
                  src={story.chapters[0].image} 
                  alt="cover" 
                  style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', marginTop: '10px'}} 
                />
              )}
              
              <div style={{marginTop: '15px'}}>
                <span style={{background: '#4facfe', color: 'white', padding: '5px 10px', borderRadius: '10px', fontSize: '0.8em'}}>
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
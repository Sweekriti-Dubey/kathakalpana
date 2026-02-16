import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { Story } from '../types';

const StoryReader: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const story = location.state?.story as Story;
    const [currentPage, setCurrentPage] = useState(0);

    if (!story) {
        navigate('/library');
        return null;
    }

    const handleFinish = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                "https://kathakalpana-api.onrender.com/complete_reading", 
                {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Chotuu is happy! You finished the story and earned XP.");
            navigate('/library');
        } catch (err) {
            console.error("Failed to update stats:", err);
            navigate('/library');
        }
    };

    return (
        <div className="reader-box">
            <div className="chapter-display">
                <h2>{story.chapters[currentPage].title}</h2>
                <p>{story.chapters[currentPage].content}</p>
            </div>
            
            <div className="reader-nav">
                <button 
                    disabled={currentPage === 0} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                >
                    <ChevronLeft size={16}/> Back
                </button>
                
                {currentPage < story.chapters.length - 1 ? (
                    <button onClick={() => setCurrentPage(prev => prev + 1)}>
                        Next Page <ChevronRight size={16}/>
                    </button>
                ) : (
                    <button className="finish-btn" onClick={handleFinish}>
                        Complete Reading <CheckCircle size={16}/>
                    </button>
                )}
            </div>
        </div>
    );
};

export default StoryReader;
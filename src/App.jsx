import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { Book, Star, Users, Info, Volume2 } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<StoryGenerator />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

function Navbar() {
  return (
    <nav className="navbar">
  <div className="logo"></div> {/* Logo Div */}
  <h1 className="title">Story Buddy</h1> {/* Title Separate */}
  <div className="nav-links">
    <Link to="/">Home</Link>
    <Link to="/generate">Create Story</Link>
    <Link to="/testimonials">Testimonials</Link>
    <Link to="/about">About Us</Link>
  </div>
</nav>

  );
}

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Story Buddy</h1>
        <p>Magical Stories for Curious Minds</p>
        <Link to="/generate" className="cta-button">
          Start Your Adventure <Book />
        </Link>
      </div>
      <div className="features-section">
        <div className="feature">
          <Star />
          <h3>Magical Genres</h3>
          <p>Choose from multiple exciting story genres</p>
        </div>
        <div className="feature">
          <Book />
          <h3>Interactive Stories</h3>
          <p>Engaging chapters with beautiful illustrations</p>
        </div>
        <div className="feature">
          <Users />
          <h3>Kid-Friendly</h3>
          <p>Safe and educational storytelling</p>
        </div>
      </div>
    </div>
  );
}

function StoryGenerator() {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [generatedStory, setGeneratedStory] = useState(null);

  const genres = [
    'Horror', 'Fictional', 'Historical', 
    'Respect', 'Empathy', 'Loyalty', 
    'Compassion', 'Moral'
  ];

  const sampleStories = {
    'Horror': {
      title: "The Whispering Shadows",
      chapters: [
        {
          title: "The Mysterious House",
          content: "Emma noticed the old house at the end of the street always seemed different. Its windows looked like eyes watching her every move.",
          image: "../images/mouse.png"
        },
        {
          title: "Strange Sounds",
          content: "At night, whispers echoed through the walls. Emma wondered if the house was trying to tell her something important.",
          image: "../images/mouse.png"
        },
        {
          title: "The Secret Revealed",
          content: "As Emma discovered the house's hidden story, she realized some mysteries are better left unsolved.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Curiosity can be both a gift and a challenge."
    },
    'Fictional': {
      title: "The Starlight Explorer",
      chapters: [
        {
          title: "A Magical Discovery",
          content: "Zara found a strange map that seemed to glow under moonlight, leading to an incredible adventure beyond imagination.",
          image: "../images/mouse.png"
        },
        {
          title: "The Cosmic Journey",
          content: "Riding a ship made of stardust, Zara traveled through galaxies, meeting creatures from distant worlds.",
          image: "../images/mouse.png"
        },
        {
          title: "Home Again",
          content: "With newfound wisdom, Zara returned home, knowing the universe is vast and full of wonder.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Every journey teaches us something new about ourselves."
    },
    'Historical': {
      title: "The Time Traveler",
      chapters: [
        {
          title: "Ancient Egypt",
          content: "Alex found a time machine and traveled back to ancient Egypt, where he met pharaohs and explored pyramids.",
          image: "../images/mouse.png"
        },
        {
          title: "Medieval Europe",
          content: "In medieval Europe, Alex witnessed knights in shining armor and grand castles.",
          image: "../images/mouse.png"
        },
        {
          title: "The Future",
          content: "Alex's journey ended in a futuristic city, filled with advanced technology and flying cars.",
          image: "../images/mouse.png"
        }
      ],
      moral: "History teaches us valuable lessons for the future."
    },
    'Respect': {
      title: "The Respectful Knight",
      chapters: [
        {
          title: "The Quest Begins",
          content: "Sir Cedric embarked on a quest to save the kingdom, always showing respect to everyone he met.",
          image: "../images/mouse.png"
        },
        {
          title: "The Dragon's Lair",
          content: "Even when facing a fierce dragon, Sir Cedric treated it with respect, earning its trust.",
          image: "../images/mouse.png"
        },
        {
          title: "The Kingdom Saved",
          content: "Sir Cedric's respectful nature helped him save the kingdom and become a beloved hero.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Respect can build strong relationships and solve conflicts."
    },
    'Empathy': {
      title: "The Empathetic Explorer",
      chapters: [
        {
          title: "A New Friend",
          content: "Lila met a lonely alien on her space adventure and showed empathy by understanding its feelings.",
          image: "../images/mouse.png"
        },
        {
          title: "Helping Hands",
          content: "Lila and the alien worked together to fix the alien's spaceship, showing empathy and teamwork.",
          image: "../images/mouse.png"
        },
        {
          title: "A Heartfelt Goodbye",
          content: "Lila's empathy helped her form a lasting friendship with the alien, even as they said goodbye.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Empathy helps us connect with others and build meaningful relationships."
    },
    'Loyalty': {
      title: "The Loyal Companion",
      chapters: [
        {
          title: "A Promise Made",
          content: "Max promised to help his friend find a lost treasure, showing loyalty and dedication.",
          image: "../images/mouse.png"
        },
        {
          title: "Challenges Faced",
          content: "Despite many challenges, Max remained loyal to his friend and never gave up.",
          image: "../images/mouse.png"
        },
        {
          title: "Treasure Found",
          content: "Max's loyalty paid off when they finally found the treasure and celebrated together.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Loyalty strengthens friendships and helps us achieve our goals."
    },
    'Compassion': {
      title: "The Compassionate Healer",
      chapters: [
        {
          title: "A Village in Need",
          content: "Maya traveled to a village in need of help and showed compassion by caring for the sick.",
          image: "../images/mouse.png"
        },
        {
          title: "Healing Hands",
          content: "Maya's compassionate nature helped her heal many villagers and bring hope to the community.",
          image: "../images/mouse.png"
        },
        {
          title: "A Grateful Village",
          content: "The villagers thanked Maya for her compassion and kindness, making her feel fulfilled.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Compassion can heal and bring hope to those in need."
    },
    'Moral': {
      title: "The Moral Mentor",
      chapters: [
        {
          title: "A Lesson Learned",
          content: "Sam learned an important moral lesson from his mentor about honesty and integrity.",
          image: "../images/mouse.png"
        },
        {
          title: "Facing Temptation",
          content: "Sam faced a difficult situation but remembered his mentor's teachings and chose the right path.",
          image: "../images/mouse.png"
        },
        {
          title: "A Better Person",
          content: "Sam's moral choices helped him become a better person and earn the respect of others.",
          image: "../images/mouse.png"
        }
      ],
      moral: "Moral values guide us to make the right choices in life."
    }
  };

  const toggleGenre = (genre) => {
    const newSelectedGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    
    setSelectedGenres(newSelectedGenres);
    
    // If only one genre is selected, generate a sample story
    if (newSelectedGenres.length === 1) {
      const selectedGenre = newSelectedGenres[0];
      setGeneratedStory(sampleStories[selectedGenre] || null);
    } else {
      setGeneratedStory(null);
    }
  };

  const playAudio = () => {
    if (generatedStory) {
      const fullStory = generatedStory.chapters.map(chapter => chapter.content).join(' ');
      // Placeholder for future voice-over implementation
      console.log('Playing audio for:', fullStory);
    }
  };

  return (
    <div className="story-generator">
      <h2>Create Your Story</h2>
      <div className="genre-selection">
        {genres.map(genre => (
          <button 
            key={genre} 
            onClick={() => toggleGenre(genre)}
            className={selectedGenres.includes(genre) ? 'selected' : ''}
          >
            {genre}
          </button>
        ))}
      </div>

      {generatedStory && (
        <div className="generated-story">
          <div className="story-header">
            <h3>{generatedStory.title}</h3>
            <button 
              className="audio-btn" 
              onClick={playAudio}
            >
              <Volume2 /> Listen to Story
            </button>
          </div>
          <div className="story-chapters">
            {generatedStory.chapters.map((chapter, index) => (
              <div key={index} className="story-chapter">
                <div className="chapter-image-container">
                  <img 
                    src={chapter.image} 
                    alt={`Chapter ${index + 1} illustration`} 
                    className="chapter-image"
                  />
                  <div className="chapter-number">
                    {index + 1}
                  </div>
                </div>
                <div className="chapter-content">
                  <div className="chapter-header">
                    <h4>{chapter.title}</h4>
                  </div>
                  <p>{chapter.content}</p>
                </div>
              </div>
            ))}
          </div>
          {generatedStory.moral && (
            <div className="story-moral">
              <h4>Moral of the Story</h4>
              <p>{generatedStory.moral}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: "Emily, 8",
      text: "I love creating stories with Story Buddy! It's so much fun!",
      image: "/api/placeholder/80/80"
    },
    {
      name: "Michael, Parent",
      text: "Great educational tool for my kids' imagination!",
      image: "/api/placeholder/80/80"
    }
  ];

  return (
    <div className="testimonials">
      <h2>What Our Users Say</h2>
      <div className="testimonial-grid">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="testimonial-card">
            <img src={testimonial.image} alt={testimonial.name} />
            <p>"{testimonial.text}"</p>
            <h4>- {testimonial.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutUs() {
  return (
    <div className="about-us">
      <h2>About Story Buddy</h2>
      <div className="mission">
        <p>
          Story Buddy is dedicated to sparking children's imagination 
          through interactive, educational storytelling. We believe 
          every child has a unique story waiting to be told.
        </p>
      </div>
      <div className="team">
        <h3>Our Team</h3>
        <div className="team-members">
          <div className="team-member">
            <img src="/api/placeholder/100/100" alt="Team Member" />
            <h4>Sarah Johnson</h4>
            <p>Founder & Storyteller</p>
          </div>
          <div className="team-member">
            <img src="/api/placeholder/100/100" alt="Team Member" />
            <h4>Alex Rodriguez</h4>
            <p>Creative Director</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>© 2025 Story Buddy. All Rights Reserved.</p>
        <div className="social-links">
          {/* Placeholder for social media icons */}
        </div>
      </div>
    </footer>
  );
}

export default App;
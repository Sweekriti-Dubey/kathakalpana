import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LottieRaw from 'lottie-react';
import rickshawData from '../assets/animations.json';
import './styles/TitleContainer.css';
import cloudImg from '../assets/images/clouds.png';
const Lottie = (LottieRaw as any).default || LottieRaw;
type AnimPhase = 'enter' | 'idle' | 'exit' | 'done';

function TitleContainer() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<AnimPhase>('enter');

  useEffect(() => {
    if (phase !== 'enter') return;
    const timer = setTimeout(() => {
      setPhase((p) => (p === 'enter' ? 'idle' : p));
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleEnterEnd = () => {
    if(phase === 'enter') {
      setTimeout(() => {
        setPhase('idle');
      }, 100);
    }
  };

  const handleGetStarted = () => {
    setPhase('exit');
  };

  const handleExitEnd = () => {
    if(phase === 'exit') {
      setPhase('done');
      navigate('/generate');
    }
  };

  
  return (
    <div className= 'rickshaw-hero'>
      <div className="navbar-clouds">
        <img src={cloudImg} alt="" className="navbar-cloud" />
        <img src={cloudImg} alt="" className="navbar-cloud" />
        <img src={cloudImg} alt="" className="navbar-cloud" />
        <img src={cloudImg} alt="" className="navbar-cloud" />
        <img src={cloudImg} alt="" className="navbar-cloud" />
        <img src={cloudImg} alt="" className="navbar-cloud" />
      </div>
      <div className = {`rickshaw-wrapper rickshaw-${phase}` }
      onAnimationEnd = {phase === 'enter' ? handleEnterEnd : handleExitEnd}>
        <Lottie 
          animationData={rickshawData}
          loop
          autoplay
          style={{width: '480px', height: '480px'}}
        />

        {phase === 'idle' && (
          <button className='button' onClick={handleGetStarted}>Get Started</button>
        )}
        

      </div>
    </div>
  );
}

export default TitleContainer;

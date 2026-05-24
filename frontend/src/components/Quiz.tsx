import React, { useEffect, useState, useMemo } from 'react';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { Brain, Trophy, ArrowRight, RefreshCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SavedWord {
  id: string;
  word: string;
  meaning: string;
  is_important: boolean;
  wrong_count: number;
}

interface Question {
  word: SavedWord;
  options: string[];
}

const Quiz: React.FC = () => {
  const { currentProfile } = useProfile();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrongWords, setWrongWords] = useState<SavedWord[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchWords();
  }, [currentProfile]);

  const fetchWords = async () => {
    if (!currentProfile?.profile_id) return;
    setLoading(true);
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('saved_words')
      .select('*')
      .eq('profile_id', currentProfile.profile_id);

    if (!error && data) {
      setWords(data as SavedWord[]);
    }
    setLoading(false);
  };

  const startQuiz = () => {
    if (words.length < 4) {
      alert("You need at least 4 saved words to take a quiz!");
      return;
    }

    const shuffled = [...words].sort((a, b) => {
      if (a.is_important && !b.is_important) return -1;
      if (!a.is_important && b.is_important) return 1;
      return Math.random() - 0.5;
    });

    const quizWords = shuffled.slice(0, 5); // 5 questions

    const newQuestions = quizWords.map(targetWord => {

      const others = words.filter(w => w.id !== targetWord.id).sort(() => Math.random() - 0.5);
      const options = [targetWord.meaning, ...others.slice(0, 3).map(o => o.meaning)];
      return {
        word: targetWord,
        options: options.sort(() => Math.random() - 0.5) // shuffle options
      };
    });

    setQuestions(newQuestions);
    setCurrentIndex(0);
    setScore(0);
    setWrongWords([]);
    setFinished(false);
    setSelectedAnswer(null);
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return; // prevent double click
    setSelectedAnswer(answer);

    const currentQ = questions[currentIndex];
    const isCorrect = answer === currentQ.word.meaning;

    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setWrongWords(prev => [...prev, currentQ.word]);

      const client = requireSupabaseClient();
      const newWrongCount = (currentQ.word.wrong_count || 0) + 1;
      const targetId = currentQ.word.id || (currentQ.word as any)._id;
      const { data, error } = await client
        .from('saved_words')
        .update({ wrong_count: newWrongCount })
        .eq(currentQ.word.id ? 'id' : '_id', targetId)
        .select();
        
      if (error) {
        console.error("Failed to update wrong_count:", error);
      } else if (!data || data.length === 0) {
        console.error("Update succeeded but 0 rows were changed. This usually means Row Level Security (RLS) is blocking the UPDATE operation!");
        alert("Warning: Database update blocked by permissions (RLS). Please check your Supabase policies.");
      } else {

        currentQ.word.wrong_count = newWrongCount;
      }
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
      } else {
        setFinished(true);
        if (score + (isCorrect ? 1 : 0) === questions.length) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
      }
    }, 1500);
  };

  if (loading) return <div className="text-center p-12 text-app-muted">Loading quiz...</div>;

  if (words.length < 4) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="card-base p-12 bg-app-surface2">
          <Brain size={48} className="mx-auto mb-4 text-app-pink opacity-50" />
          <h2 className="text-2xl font-black text-app-text mb-2">Keep Reading!</h2>
          <p className="text-app-muted mb-6">You need at least 4 saved words to unlock practice quizzes.</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="card-base p-12 bg-app-surface border border-app-border">
          <div className="w-20 h-20 bg-app-violet/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain size={40} className="text-app-violet" />
          </div>
          <h1 className="text-3xl font-black text-app-text mb-4 font-playfair">Ready to Practice?</h1>
          <p className="text-app-muted mb-8 max-w-sm mx-auto">Take a quick 5-question quiz to strengthen your vocabulary. Highlighted words will appear first!</p>
          <button onClick={startQuiz} className="button bg-app-violet text-white px-8 py-3 rounded-xl font-bold hover:bg-app-violet/90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="card-base p-8 text-center bg-app-surface2">
          <Trophy size={64} className="mx-auto mb-4 text-app-gold" />
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-app-gold to-yellow-300 font-playfair mb-2">Quiz Complete!</h2>
          <p className="text-xl font-bold text-app-text mb-8">You scored {score} out of {questions.length}</p>
          
          {wrongWords.length > 0 && (
            <div className="text-left bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-bold text-red-400 mb-4">Words to review:</h3>
              <div className="space-y-3">
                {wrongWords.map(w => (
                  <div key={w.id} className="bg-app-surface p-3 rounded-xl border border-red-500/10">
                    <span className="font-bold text-app-text">{w.word}:</span> <span className="text-sm text-app-muted">{w.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={startQuiz} className="button flex items-center justify-center gap-2 mx-auto bg-app-violet text-white px-8 py-3 rounded-xl font-bold hover:bg-app-violet/90">
            <RefreshCcw size={18} /> Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-app-muted">Question {currentIndex + 1} of {questions.length}</h2>
        <div className="text-app-violet font-bold bg-app-violet/10 px-4 py-1.5 rounded-full border border-app-violet/20">Score: {score}</div>
      </div>

      <div className="card-base p-8 bg-app-surface border border-app-violet/30 shadow-[0_0_30px_rgba(139,92,246,0.1)] mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-white to-app-pink font-playfair capitalize mb-8 tracking-wide">
          {currentQ.word.word}
        </h1>

        <div className="grid gap-3">
          {currentQ.options.map((opt, i) => {
            let stateClass = "bg-app-surface2 border-app-border hover:border-app-violet hover:bg-app-violet/10 text-app-text";
            if (selectedAnswer === opt) {
              if (opt === currentQ.word.meaning) {
                stateClass = "bg-green-500/20 border-green-500 text-green-400 font-bold";
              } else {
                stateClass = "bg-red-500/20 border-red-500 text-red-400 font-bold";
              }
            } else if (selectedAnswer !== null && opt === currentQ.word.meaning) {
              stateClass = "bg-green-500/20 border-green-500 text-green-400 font-bold"; // highlight correct answer
            }

            return (
              <button
                key={i}
                disabled={selectedAnswer !== null}
                onClick={() => handleAnswer(opt)}
                className={`p-4 rounded-xl border text-left transition-all ${stateClass} ${selectedAnswer !== null ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Quiz;

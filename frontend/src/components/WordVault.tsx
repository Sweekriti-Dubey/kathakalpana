import React, { useEffect, useState } from 'react';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { BookA, Star } from 'lucide-react';

interface SavedWord {
  id: string;
  word: string;
  meaning: string;
  is_important: boolean;
  created_at: string;
}

const WordVault: React.FC = () => {
  const { currentProfile } = useProfile();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWords = async () => {
      if (!currentProfile?.profile_id) return;
      const client = requireSupabaseClient();
      const { data, error } = await client
        .from('saved_words')
        .select('*')
        .eq('profile_id', currentProfile.profile_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to fetch saved words:", error);
      } else if (data) {
        setWords(data as SavedWord[]);
      }
      setLoading(false);
    };

    fetchWords();
  }, [currentProfile]);

  if (loading) {
    return <div className="text-center p-12 text-app-muted">Opening vault...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-app-pink to-app-violet flex items-center justify-center text-white shadow-lg shadow-app-pink/30">
          <BookA size={24} />
        </div>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-app-pink font-playfair">
          My Word Vault
        </h1>
      </div>

      {words.length === 0 ? (
        <div className="card-base p-12 text-center text-app-muted border-app-border bg-app-surface2">
          <BookA size={48} className="mx-auto mb-4 opacity-30 text-app-pink" />
          <h3 className="text-xl font-bold mb-2 text-app-text">Your vault is empty!</h3>
          <p>Read some stories and save words you want to remember.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {words.map(w => (
            <div key={w.id} className="card-base p-6 border-app-border bg-app-surface/50 hover:border-app-violet/40 hover:bg-app-surface transition-all relative overflow-hidden group">
              {w.is_important && (
                <div className="absolute top-3 right-3 text-app-gold">
                  <Star size={16} fill="currentColor" />
                </div>
              )}
              <h3 className="text-xl font-black text-app-pink mb-2 capitalize">{w.word}</h3>
              <p className="text-sm text-app-text leading-relaxed">{w.meaning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordVault;

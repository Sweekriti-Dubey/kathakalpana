import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BookOpen, Clock, TrendingUp, Star,
  BarChart3, LineChart, FileText, Settings,
  ChevronRight, Calendar, Menu, X,
  LayoutDashboard, Bookmark, UserCircle, LogOut,
  Plus, Trash2, Save, Monitor, Shield, Target, Users
} from 'lucide-react';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { useNavigate } from 'react-router-dom';
import owlLogo from '../assets/images/owllogo.webp';

interface Chapter { image_url?: string; }
interface Story {
  id?: string;
  _id?: string;
  title: string;
  content?: Story;
  chapters?: Chapter[];
  created_at: string;
}

const isWithinDays = (dateStr: string, days: number): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

const plainTextStyle: React.CSSProperties = {
  WebkitTextFillColor: 'unset',
  backgroundClip: 'unset',
  WebkitBackgroundClip: 'unset',
  background: 'none',
};

const DashboardView: React.FC<{
  stories: Story[];
  readingHistory: any[];
  loading: boolean;
  thisWeekCount: number;
  setActiveTab: (tab: TabType) => void;
}> = ({ stories, readingHistory, loading, thisWeekCount, setActiveTab }) => {
  const { availableProfiles } = useProfile();
  
  const [showStatsDropdown, setShowStatsDropdown] = useState(false);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const storiesThisWeek = readingHistory.filter(r => new Date(r.created_at) >= oneWeekAgo).length;
  const storiesLastWeek = readingHistory.filter(r => {
    const d = new Date(r.created_at);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  }).length;
  
  const extraStories = storiesThisWeek - storiesLastWeek;
  const extraText = extraStories > 0 ? `+${extraStories} vs last week` : extraStories < 0 ? `${extraStories} vs last week` : 'Same as last week';

  const statCards = [
    { 
      icon: BookOpen, 
      label: 'Finished Stories (This Week)', 
      value: loading ? '...' : String(storiesThisWeek), 
      color: 'bg-blue-500', 
      textColor: 'text-blue-400',
      onClick: () => setShowStatsDropdown(!showStatsDropdown)
    },
    { 
      icon: TrendingUp, 
      label: 'This Week Progress', 
      value: loading ? '...' : String(storiesThisWeek), 
      subtext: extraText,
      color: 'bg-green-500', 
      textColor: 'text-green-400' 
    },
  ];

  const placeholderSections = [
    { icon: BarChart3, title: 'Learning Metrics', description: 'Track vocabulary growth, words learned, and reading comprehension.', color: 'text-app-violet', borderColor: 'border-app-violet/20', bgColor: 'bg-app-violet/10' },
    { icon: LineChart, title: 'Reading History', description: 'Visualize daily and weekly reading trends with interactive charts.', color: 'text-app-cyan', borderColor: 'border-app-cyan/20', bgColor: 'bg-app-cyan/10' },
    { icon: FileText, title: 'Content Review', description: 'Preview AI-generated stories before your child reads them.', color: 'text-app-gold', borderColor: 'border-app-gold/20', bgColor: 'bg-app-gold/10' },
    { icon: Shield, title: 'Safety Alerts', description: 'Get notified if any stories contain restricted keywords.', color: 'text-app-pink', borderColor: 'border-app-pink/20', bgColor: 'bg-app-pink/10' },
  ];

  const recentStories = stories.slice(0, 3);

  const getKidName = (profileId?: string) => {
    if (!profileId) return 'Unknown Kid';
    const profile = availableProfiles.find(p => p.profile_id === profileId);
    return profile?.name || 'Unknown Kid';
  };

  const kids = availableProfiles.filter(p => p.profile_type === 'kid');

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8 relative">
        {statCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div 
              key={card.label} 
              onClick={card.onClick}
              className={`stat-card p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 ${card.onClick ? 'cursor-pointer hover:border-app-violet/40 transition-colors' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${card.color}`}>
                <IconComp size={18} />
              </div>
              <div>
                <div className="flex items-end gap-2 mb-0.5">
                  <h3 className="text-xl sm:text-2xl font-bold text-app-text" style={plainTextStyle}>{card.value}</h3>
                  {card.subtext && <span className="text-xs text-app-muted mb-1">{card.subtext}</span>}
                </div>
                <p className="text-xs sm:text-sm text-app-muted">{card.label}</p>
              </div>
            </div>
          );
        })}

        {showStatsDropdown && (
          <div className="absolute top-full mt-2 left-0 w-full sm:w-[calc(50%-8px)] bg-app-surface2 border border-app-border rounded-xl shadow-xl z-20 p-5 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-app-border">
              <h4 className="font-bold text-app-text text-xs uppercase tracking-wider text-app-violet flex items-center gap-2">
                <BookOpen size={14} /> This Week's Progress
              </h4>
              <button onClick={() => setShowStatsDropdown(false)} className="text-app-muted hover:text-app-pink transition-colors"><X size={16}/></button>
            </div>
            <div className="space-y-3">
              {kids.map(kid => {
                const kidStories = readingHistory.filter(r => r.profile_id === kid.profile_id && new Date(r.created_at) >= oneWeekAgo).length;
                return (
                  <div key={kid.profile_id} className="flex items-center justify-between bg-app-surface p-3 rounded-lg border border-app-border/50 hover:border-app-violet/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-app-surface2 flex items-center justify-center text-xl border border-app-border">
                        {kid.avatar_emoji}
                      </div>
                      <span className="font-bold text-app-text">{kid.name}</span>
                    </div>
                    <div className="bg-app-violet/10 border border-app-violet/20 text-app-violet font-bold px-3 py-1 rounded-full text-sm">
                      {kidStories} {kidStories === 1 ? 'story' : 'stories'}
                    </div>
                  </div>
                );
              })}
              {kids.length === 0 && <p className="text-xs text-app-muted text-center py-2">No kid profiles found.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-app-violet" />
            <h3 className="text-lg font-semibold text-app-text" style={plainTextStyle}>Recently Saved Stories</h3>
          </div>
          <button 
            onClick={() => setActiveTab('stories')}
            className="flex items-center gap-1 text-sm font-bold text-app-violet hover:text-app-pink transition-colors"
          >
            View More <ChevronRight size={16} />
          </button>
        </div>
        {loading ? (
          <div className="text-app-muted text-sm">Loading stories...</div>
        ) : recentStories.length === 0 ? (
          <div className="card-base p-6 text-center text-app-muted text-sm">No stories saved yet.</div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recentStories.map((story) => (
              <div key={story.id ?? story._id} className="card-base p-4 flex items-center gap-4 hover:border-app-violet/30 transition-colors">
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-app-surface2 flex-shrink-0">
                  {story.chapters?.[0]?.image_url ? (
                    <img src={story.chapters[0].image_url} alt={story.title} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-app-muted" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-app-text truncate mb-1" style={plainTextStyle}>{story.title}</h4>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-app-violet/10 text-app-violet w-fit truncate max-w-full">
                      {getKidName((story as any).profile_id)}
                    </span>
                    <p className="text-[11px] text-app-muted flex items-center gap-1">
                      <Clock size={10} /> 
                      {new Date(story.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4"><h3 className="text-lg font-semibold text-app-text" style={plainTextStyle}>Coming Soon</h3></div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-8">
        {placeholderSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className={`card-base p-6 border ${section.borderColor} opacity-75 hover:opacity-100 transition-opacity`}>
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${section.bgColor} flex-shrink-0`}>
                  <SectionIcon size={20} className={section.color} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-app-text" style={plainTextStyle}>{section.title}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-app-surface2 text-app-muted border border-app-border">Soon</span>
                  </div>
                  <p className="text-xs text-app-muted leading-relaxed">{section.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const SettingsView: React.FC = () => (
  <div className="max-w-lg w-full">
    <div className="card-base p-6 md:p-8 space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-1" style={plainTextStyle}>Parental Settings</h3>
        <p className="text-app-muted text-sm mb-6">Manage reading habits and content safety.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-app-text mb-2"><Monitor size={16} className="text-app-blue"/> Daily Screen Time Limit (Minutes)</label>
          <input type="number" defaultValue={60} className="w-full bg-app-surface2 border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-violet transition-colors" />
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-app-text mb-2"><Shield size={16} className="text-app-pink"/> Story Content Age Rating</label>
          <select className="w-full bg-app-surface2 border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-violet transition-colors">
            <option>All Ages (G)</option>
            <option>7+ Years (PG)</option>
            <option>12+ Years (PG-13)</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-app-text mb-2"><Target size={16} className="text-app-green"/> Weekly Reading Goal (Stories)</label>
          <input type="number" defaultValue={5} className="w-full bg-app-surface2 border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-violet transition-colors" />
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-2 bg-app-violet text-white py-3 rounded-xl font-bold hover:bg-app-violet/90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
        <Save size={18} /> Save Settings
      </button>
    </div>
  </div>
);

import AddKidModal from './AddKidModal';

const StoriesView: React.FC<{ stories: Story[], loading: boolean, onDeleteStory: (id: string) => void }> = ({ stories, loading, onDeleteStory }) => {
  const { availableProfiles } = useProfile();

  const getKidName = (profileId?: string) => {
    if (!profileId) return 'Unknown Kid';
    const profile = availableProfiles.find(p => p.profile_id === profileId);
    return profile?.name || 'Unknown Kid';
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bookmark size={24} className="text-app-violet" />
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-app-pink font-playfair tracking-wide" style={plainTextStyle}>All Saved Stories</h3>
      </div>
      
      {loading ? (
        <div className="text-app-muted">Loading stories...</div>
      ) : stories.length === 0 ? (
        <div className="card-base p-12 text-center text-app-muted">
          <BookOpen size={48} className="mx-auto mb-4 opacity-50 text-app-pink" />
          <h3 className="text-xl font-bold mb-2 text-app-text" style={plainTextStyle}>No Stories Yet</h3>
          <p>Stories generated by kids will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div key={story.id ?? story._id} className="card-base group overflow-hidden border border-app-border/50 hover:border-app-violet/50 transition-all">
              <div className="aspect-[4/3] bg-app-surface2 overflow-hidden relative">
                {story.chapters?.[0]?.image_url ? (
                  <img src={story.chapters[0].image_url} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><BookOpen size={32} className="text-app-muted opacity-50" /></div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">
                  <Clock size={10} className="text-app-pink" />
                  {new Date(story.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
              
              <div className="p-5">
                <h4 className="text-lg font-bold text-app-text mb-3 line-clamp-2" style={plainTextStyle}>{story.title}</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-app-violet/20 flex items-center justify-center text-xs border border-app-violet/30">
                      {availableProfiles.find(p => p.profile_id === (story as any).profile_id)?.avatar_emoji || '👨'}
                    </div>
                    <span className="text-xs font-semibold text-app-muted">
                      {getKidName((story as any).profile_id)}
                    </span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this story?")) {
                        const storyId = story.id || story._id;
                        if (!storyId) return;
                        const client = requireSupabaseClient();
                        const { error } = await client.from('stories').delete().eq('id', storyId);
                        if (!error) {
                          onDeleteStory(storyId);
                        } else {
                          console.error("Failed to delete story:", error);
                          alert("Failed to delete story");
                        }
                      }
                    }}
                    className="p-1.5 text-app-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    title="Delete Story"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WordsView: React.FC = () => {
  const { availableProfiles } = useProfile();
  const [selectedKid, setSelectedKid] = useState<string>('');
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const kids = availableProfiles.filter(p => p.profile_type === 'kid');

  useEffect(() => {
    if (kids.length > 0 && !selectedKid) {
      setSelectedKid(kids[0].profile_id);
    }
  }, [kids, selectedKid]);

  useEffect(() => {
    if (!selectedKid) return;
    const fetchWords = async () => {
      setLoading(true);
      const client = requireSupabaseClient();
      const { data, error } = await client
        .from('saved_words')
        .select('*')
        .eq('profile_id', selectedKid)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setWords(data);
      } else {
        setWords([]);
      }
      setLoading(false);
    };
    fetchWords();
  }, [selectedKid]);

  const toggleImportance = async (word: any) => {
    const wordId = word.id || word._id;
    const currentStatus = word.is_important;
    if (!wordId) return;

    setWords(prev => prev.map(w => (w.id || w._id) === wordId ? { ...w, is_important: !currentStatus } : w));
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('saved_words')
      .update({ is_important: !currentStatus })
      .eq(word.id ? 'id' : '_id', wordId)
      .select();

    if (error) {
      console.error("Error toggling importance:", error);
    } else if (!data || data.length === 0) {
      console.error("RLS blocked the update! 0 rows affected.");
      alert("Warning: Could not save highlight because your database permissions (RLS) blocked the update.");
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BookOpen size={24} className="text-app-violet" />
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-app-pink font-playfair tracking-wide" style={plainTextStyle}>New Words Learnt</h3>
        </div>
        <select 
          value={selectedKid} 
          onChange={(e) => setSelectedKid(e.target.value)}
          className="bg-app-surface2 border border-app-border rounded-xl px-4 py-2 text-app-text font-bold focus:outline-none focus:border-app-violet transition-colors"
        >
          {kids.map(k => (
            <option key={k.profile_id} value={k.profile_id}>{k.name}</option>
          ))}
          {kids.length === 0 && <option value="">No kids available</option>}
        </select>
      </div>

      <p className="text-app-muted text-sm mb-6">Words highlighted as <Star size={12} className="inline text-app-gold" fill="currentColor"/> Important will be prioritized in your kid's Practice Quiz.</p>

      {loading ? (
        <div className="text-app-muted">Loading vocabulary...</div>
      ) : words.length === 0 ? (
        <div className="card-base p-12 text-center text-app-muted border-app-border">
          <p>No words saved by this kid yet.</p>
        </div>
      ) : (
        <div className="bg-app-surface2 rounded-xl overflow-hidden border border-app-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-app-surface border-b border-app-border text-app-muted text-sm">
                <tr>
                  <th className="px-6 py-4 font-semibold">Word</th>
                  <th className="px-6 py-4 font-semibold">Meaning</th>
                  <th className="px-6 py-4 font-semibold text-center">Quiz Mistakes</th>
                  <th className="px-6 py-4 font-semibold text-center">Highlight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {words.map(w => (
                  <tr key={w.id} className="hover:bg-app-surface/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-app-pink capitalize">{w.word}</td>
                    <td className="px-6 py-4 text-app-text text-sm">{w.meaning}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${w.wrong_count > 0 ? 'bg-red-500/20 text-red-400' : 'bg-app-surface border border-app-border text-app-muted'}`}>
                          {w.wrong_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleImportance(w)}
                        className={`p-2 rounded-lg transition-colors border ${w.is_important ? 'bg-yellow-500/10 border-yellow-500/30 text-app-gold' : 'border-transparent text-app-muted hover:text-app-text hover:bg-app-surface'}`}
                        title={w.is_important ? "Remove Highlight" : "Highlight as Important"}
                      >
                        <Star size={20} fill={w.is_important ? "currentColor" : "none"} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const EditKidRow: React.FC<{ kid: any }> = ({ kid }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(kid.name);
  const [ageRange, setAgeRange] = useState(kid.kid_profiles?.[0]?.age_range || '3-5');
  const [screenTime, setScreenTime] = useState(kid.kid_settings?.[0]?.screen_time_limits?.mon?.max || 60);
  const [dailyGoal, setDailyGoal] = useState(kid.kid_settings?.[0]?.daily_goal || 2);
  const [saving, setSaving] = useState(false);
  const { refreshProfiles } = useProfile();

  const handleSave = async () => {
    setSaving(true);
    const client = requireSupabaseClient();
    try {

      await client.from('profiles_v2').update({ name }).eq('profile_id', kid.profile_id);

      await client.from('kid_profiles').update({ age_range: ageRange }).eq('profile_id', kid.profile_id);

      const dayLimit = { min: 15, max: screenTime };
      const screenTimeLimits = { mon: dayLimit, tue: dayLimit, wed: dayLimit, thu: dayLimit, fri: dayLimit, sat: dayLimit, sun: dayLimit };
      await client.from('kid_settings').upsert({
        profile_id: kid.profile_id,
        screen_time_limits: screenTimeLimits,
        daily_goal: dailyGoal
      }, { onConflict: 'profile_id' });

      await refreshProfiles();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update kid profile:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col p-4 rounded-xl border border-app-border bg-app-surface2 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-3xl">
            {kid.avatar_emoji}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-app-text font-bold text-lg">{name}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 whitespace-nowrap">
                {ageRange} yrs
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted">
              <span>Screen Time: <strong className="text-app-text">{screenTime}m/day</strong></span>
              <span>Daily Goal: <strong className="text-app-text">{dailyGoal} stories</strong></span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-app-muted hover:text-app-text bg-app-surface border border-app-border rounded-lg transition-colors" 
            title={isEditing ? "Cancel" : "Edit Profile"}
          >
            {isEditing ? <X size={16} /> : <Settings size={16} />}
          </button>
          <button className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors" title="Delete Profile">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-app-border grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-xs font-bold text-app-muted mb-1 uppercase tracking-wider">Name</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:border-app-violet" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-app-muted mb-1 uppercase tracking-wider">Age Range</label>
            <select 
              value={ageRange} onChange={e => setAgeRange(e.target.value)}
              className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:border-app-violet"
            >
              <option value="3-5">3-5 years</option>
              <option value="6-8">6-8 years</option>
              <option value="9-12">9-12 years</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-app-muted mb-1 uppercase tracking-wider">Screen Time (mins/day)</label>
            <input 
              type="number" min="15" step="15" value={screenTime} onChange={e => setScreenTime(Number(e.target.value))}
              className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:border-app-violet" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-app-muted mb-1 uppercase tracking-wider">Daily Goal (stories)</label>
            <input 
              type="number" min="1" step="1" value={dailyGoal} onChange={e => setDailyGoal(Number(e.target.value))}
              className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:border-app-violet" 
            />
          </div>
          <div className="col-span-1 sm:col-span-2 flex justify-end mt-2">
            <button 
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-app-violet text-white font-bold rounded-lg hover:bg-app-violet/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'} <Save size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ManageAccountView: React.FC = () => {
  const { availableProfiles } = useProfile();
  const [isAddKidModalOpen, setIsAddKidModalOpen] = useState(false);
  const kids = availableProfiles.filter(p => p.profile_type === 'kid');

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card-base p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1" style={plainTextStyle}>Kid Profiles</h3>
            <p className="text-app-muted text-sm">Manage or add new readers to your account.</p>
          </div>
          <button 
            onClick={() => setIsAddKidModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-app-pink/20 text-app-pink border border-app-pink/30 rounded-xl text-sm font-bold hover:bg-app-pink/30 transition-colors"
          >
            <Plus size={16} /> Add Kid
          </button>
        </div>

        <div className="space-y-4">
          {kids.map(kid => <EditKidRow key={kid.profile_id} kid={kid} />)}
          {kids.length === 0 && <p className="text-app-muted text-sm text-center py-4">No kid profiles found.</p>}
        </div>
      </div>

      <div className="card-base p-6 md:p-8 border-red-500/20 bg-red-500/5">
        <h3 className="text-xl font-bold text-red-400 mb-2" style={plainTextStyle}>Danger Zone</h3>
        <p className="text-sm text-app-muted mb-6">Irreversible actions for your entire household account.</p>
        <button 
          onClick={async () => {
            const confirmed = window.confirm("Are you absolutely sure you want to delete your entire account? This action cannot be undone and will delete all kid profiles, stories, and pet data.");
            if (!confirmed) return;
            
            try {
              const client = requireSupabaseClient();
              const { data } = await client.auth.getSession();
              const token = data.session?.access_token;
              if (!token) throw new Error("No access token");
              
              const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
              const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '') ?? '';
              
              const res = await fetch(`${functionsBaseUrl}/delete-account`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to delete account");
              }
              
              await client.auth.signOut();
              localStorage.clear();
              window.location.href = '/login';
            } catch (err: any) {
              console.error("Error deleting account:", err);
              alert(err.message || "An error occurred while deleting your account.");
            }
          }}
          className="px-5 py-2.5 bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-colors"
        >
          Delete Entire Account
        </button>
      </div>

      <AddKidModal 
        isOpen={isAddKidModalOpen} 
        onClose={() => setIsAddKidModalOpen(false)} 
      />
    </div>
  );
};

type TabType = 'dashboard' | 'stories' | 'words' | 'settings' | 'account';

const ParentDashboard: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { currentProfile, openSelector } = useProfile();
  const navigate = useNavigate();
  const client = useMemo(() => requireSupabaseClient(), []);

  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '') ?? '';

  const [readingHistory, setReadingHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      if (functionsBaseUrl) {
        try {
          const { data } = await client.auth.getSession();
          const token = data.session?.access_token ?? '';
          const response = await axios.get<Story[]>(`${functionsBaseUrl}/my-stories`, { headers: { Authorization: `Bearer ${token}` } });
          const normalized = (response.data ?? []).map((story: Story) => {
            const content = story.content ?? story;
            return { ...story, ...content, chapters: content.chapters ?? story.chapters ?? [] };
          });
          setStories(normalized);
        } catch (err) {
          console.error('Error fetching stories for parent dashboard:', err);
        }
      }

      try {
        const { data, error } = await client
          .from('reading_history')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setReadingHistory(data);
        }
      } catch (err) {
        console.error('Error fetching reading history:', err);
      }
      
      setLoading(false);
    };
    fetchDashboardData();
  }, [functionsBaseUrl, client]);

  const handleLogout = async () => {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn("Signout error caught:", e);
    } finally {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'stories', icon: Bookmark, label: 'Saved Stories' },
    { id: 'words', icon: BookOpen, label: 'New Words Learnt' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'account', icon: UserCircle, label: 'Manage Account' },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'settings': return <SettingsView />;
      case 'account': return <ManageAccountView />;
      case 'words': return <WordsView />;
      case 'stories': 
        return <StoriesView stories={stories} loading={loading} onDeleteStory={(id) => setStories(s => s.filter(story => story.id !== id && story._id !== id))} />;
      default: 
        return <DashboardView 
          stories={stories} 
          readingHistory={readingHistory}
          loading={loading} 
          thisWeekCount={stories.filter(s => isWithinDays(s.created_at, 7)).length}
          setActiveTab={setActiveTab}
        />;
    }
  };

  return (
    <div className="flex min-h-screen bg-app-bg text-app-text font-sans">
      
      {}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-app-surface/90 backdrop-blur z-50 border-b border-app-border flex items-center justify-between px-4">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-app-violet to-app-pink font-playfair">Parent Hub</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-app-text">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-app-surface border-r border-app-border z-40
        flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 hidden lg:block border-b border-app-border/50">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-app-violet to-app-pink font-playfair tracking-wide">
              Katha Kalpana
            </h1>
          </div>
          <p className="text-xs text-app-muted mt-1 uppercase tracking-widest font-bold">Parent Portal</p>
        </div>

        <div className="p-4 flex items-center gap-3 bg-app-surface2/50 m-4 rounded-2xl border border-app-border/50">
          <div className="w-10 h-10 rounded-xl bg-app-violet/20 flex items-center justify-center text-xl border border-app-violet/30">
            {currentProfile?.avatar_emoji || '👨'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate" style={plainTextStyle}>{currentProfile?.name || 'Parent'}</p>
            <p className="text-[10px] text-app-muted uppercase tracking-wider">Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive 
                  ? 'bg-app-violet/15 text-app-violet border border-app-violet/30 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]' 
                  : 'text-app-muted hover:text-app-text hover:bg-app-surface2 border border-transparent'
                }`}
              >
                <IconComp size={18} className={isActive ? 'text-app-violet' : 'text-app-muted opacity-70'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-app-border">
          <button onClick={openSelector} className="w-full flex items-center gap-3 px-4 py-3 text-app-muted hover:text-white transition-colors text-sm font-medium">
            <Users size={18} className="opacity-70" /> Switch Profiles
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-app-pink bg-app-pink/10 hover:bg-app-pink/20 transition-colors text-sm font-bold border border-app-pink/20">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {}
      <main className="flex-1 min-w-0 p-4 lg:p-8 pt-24 lg:pt-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {}
          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-playfair font-black mb-2" style={plainTextStyle}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-app-muted text-sm">
              {activeTab === 'dashboard' && "Overview of your child's reading journey"}
              {activeTab === 'settings' && "Configure limits and parental controls"}
              {activeTab === 'account' && "Manage profiles and account data"}
              {activeTab === 'stories' && "Review and edit generated stories"}
            </p>
          </div>

          {}
          {renderContent()}
        </div>
      </main>

      {}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default ParentDashboard;

export interface Chapter {
  title: string;
  content: string;
  image_prompt?: string;
  image_seed?: number;
  image_url?: string | null;
  image_error?: string | null;
}

export interface Story{
  id?: string;
  title: string;
  moral: string;
  chapters: Chapter[];
  created_at?: string;
}

export interface PetStatus {
  pet_name: string;
  xp: number;
  level: number;
  evolution_stage: 'egg' | 'hatchling' | 'adult';
}

export interface Profile {
  profile_id: string;
  user_id: string;
  profile_type: 'parent' | 'kid';
  name: string;
  avatar_emoji: string;
  profile_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kid_profiles?: KidProfileDetail[] | null;
  kid_settings?: KidSettings[] | null;
  parent_account?: ParentAccount[] | null;
}

export interface KidProfileDetail {
  profile_id: string;
  birth_year: number | null;
  age_range: '3-5' | '6-8' | '9-12' | null;
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  parent_profile_id: string;
}

export interface ScreenTimeLimits {
  min: number;
  max: number;
}

export interface KidSettings {
  id?: string;
  profile_id: string;
  screen_time_limits: Record<string, ScreenTimeLimits>;  // per-day JSONB: { mon: {min, max}, tue: {min, max}, ... }
  violence_filter: 'strict' | 'moderate' | 'loose';
  vocabulary_level: 'easy' | 'age_appropriate' | 'advanced';
  approved_genres: string[];
  dyslexia_font_enabled: boolean;
  default_text_size: 'small' | 'medium' | 'large' | 'xl';
  kid_color_palette: 'default' | 'warm' | 'calm' | 'high_contrast';
  weekly_stories_goal: number;
  weekly_reading_minutes_goal: number;
  weekly_words_goal: number;
}

export interface ParentAccount {
  id?: string;
  profile_id: string;
  parental_gate_hash: string | null;
}
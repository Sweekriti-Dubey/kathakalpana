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
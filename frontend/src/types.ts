export interface Chapter {
  title: string;
  content: string;
  image_propmpt: string;
  image_seed: number;
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
  evolution_stage: 'egg' | 'hatching' | 'adult';
}
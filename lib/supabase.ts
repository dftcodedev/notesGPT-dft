import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Note = {
  id: string;
  user_id: string;
  audio_file_url: string;
  title: string | null;
  transcription: string | null;
  summary: string | null;
  embedding: number[] | null;
  generating_transcript: boolean;
  generating_title: boolean;
  generating_action_items: boolean;
  created_at: string;
  updated_at: string;
};

export type ActionItem = {
  id: string;
  note_id: string;
  user_id: string;
  task: string;
  created_at: string;
};

export type NoteWithCount = Note & {
  count: number;
};

export type ActionItemWithTitle = ActionItem & {
  title: string | null;
};

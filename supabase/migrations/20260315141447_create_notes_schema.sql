/*
  # Notes GPT Schema Migration

  ## Overview
  This migration creates the database schema for a voice notes application with AI-powered transcription, 
  summarization, and action item extraction capabilities.

  ## Tables Created

  ### 1. notes
  Primary table for storing voice recordings and their AI-generated content
  - `id` (uuid, primary key) - Unique identifier for each note
  - `user_id` (uuid, foreign key) - References auth.users, owner of the note
  - `audio_file_url` (text) - URL to the stored audio file
  - `title` (text, nullable) - AI-generated title for the note
  - `transcription` (text, nullable) - Whisper-generated transcription
  - `summary` (text, nullable) - AI-generated summary
  - `embedding` (vector(768), nullable) - Vector embedding for semantic search
  - `generating_transcript` (boolean) - Flag indicating if transcription is in progress
  - `generating_title` (boolean) - Flag indicating if title generation is in progress
  - `generating_action_items` (boolean) - Flag indicating if action items are being extracted
  - `created_at` (timestamptz) - When the note was created
  - `updated_at` (timestamptz) - When the note was last updated

  ### 2. action_items
  Stores AI-extracted action items from voice notes
  - `id` (uuid, primary key) - Unique identifier for each action item
  - `note_id` (uuid, foreign key) - References notes table
  - `user_id` (uuid, foreign key) - References auth.users, owner of the action item
  - `task` (text) - The action item text
  - `created_at` (timestamptz) - When the action item was created

  ## Indexes
  - notes: by user_id, by embedding (vector index for semantic search)
  - action_items: by note_id, by user_id

  ## Security (Row Level Security)
  - All tables have RLS enabled
  - Users can only access their own notes and action items
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations
  - Authentication required for all operations

  ## Extensions
  - vector: Required for storing and querying embeddings for semantic search
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_file_url text NOT NULL,
  title text,
  transcription text,
  summary text,
  embedding vector(768),
  generating_transcript boolean DEFAULT false NOT NULL,
  generating_title boolean DEFAULT false NOT NULL,
  generating_action_items boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS action_items_note_id_idx ON action_items(note_id);
CREATE INDEX IF NOT EXISTS action_items_user_id_idx ON action_items(user_id);

-- Create vector index for semantic search
CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Action items policies
CREATE POLICY "Users can view own action items"
  ON action_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action items"
  ON action_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action items"
  ON action_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own action items"
  ON action_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

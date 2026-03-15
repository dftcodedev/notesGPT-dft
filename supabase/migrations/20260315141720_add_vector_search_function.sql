/*
  # Add Vector Search Function

  ## Overview
  This migration creates a stored procedure for performing semantic search on notes using vector embeddings.

  ## Functions Created

  ### match_notes
  Performs cosine similarity search on note embeddings to find semantically similar notes.
  
  Parameters:
  - query_embedding: The embedding vector to search with
  - match_threshold: Minimum similarity score (0-1)
  - match_count: Maximum number of results to return

  Returns matching notes with similarity scores, filtered by the requesting user's ID.
*/

CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  audio_file_url text,
  title text,
  transcription text,
  summary text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.user_id,
    notes.audio_file_url,
    notes.title,
    notes.transcription,
    notes.summary,
    1 - (notes.embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE notes.user_id = auth.uid()
    AND notes.embedding IS NOT NULL
    AND 1 - (notes.embedding <=> query_embedding) > match_threshold
  ORDER BY notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

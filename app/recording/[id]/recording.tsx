'use client';

import RecordingDesktop from '@/components/pages/recording/RecordingDesktop';
import RecordingMobile from '@/components/pages/recording/RecordingMobile';
import { supabase } from '@/lib/supabase';
import type { Note, ActionItem } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function RecordingPage({ id }: { id: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: noteData } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (noteData) {
      setNote(noteData);

      const { data: items } = await supabase
        .from('action_items')
        .select('*')
        .eq('note_id', noteData.id)
        .order('created_at', { ascending: true });

      if (items) {
        setActionItems(items);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-2xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      {note === null ? (
        <div className="mt-10 text-center">
          <h1 className="text-4xl">Note not found</h1>
        </div>
      ) : (
        <>
          <RecordingDesktop note={note} actionItems={actionItems} />
          <RecordingMobile note={note} actionItems={actionItems} />
        </>
      )}
    </div>
  );
}

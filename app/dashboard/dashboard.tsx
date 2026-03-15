'use client';

import RecordedfileItemCard from '@/components/pages/dashboard/RecordedfileItemCard';
import { supabase } from '@/lib/supabase';
import type { NoteWithCount } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardHomePage() {
  const [allNotes, setAllNotes] = useState<NoteWithCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relevantNotes, setRelevantNotes] = useState<NoteWithCount[] | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (notes) {
      const notesWithCount = await Promise.all(
        notes.map(async (note) => {
          const { count } = await supabase
            .from('action_items')
            .select('*', { count: 'exact', head: true })
            .eq('note_id', note.id);
          return { ...note, count: count || 0 };
        })
      );
      setAllNotes(notesWithCount);
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery === '') {
      setRelevantNotes(undefined);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: searchQuery }),
        }
      );

      if (response.ok) {
        const { embedding } = await response.json();

        const { data: similarNotes } = await supabase.rpc('match_notes', {
          query_embedding: embedding,
          match_threshold: 0.6,
          match_count: 16,
        });

        if (similarNotes) {
          const noteIds = similarNotes.map((n: any) => n.id);
          const filtered = allNotes.filter((note) => noteIds.includes(note.id));
          setRelevantNotes(filtered);
        }
      }
    }
  };

  const finalNotes = relevantNotes ?? allNotes;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-2xl">Loading...</p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning={true} className="mt-5 min-h-[100vh] w-full">
      <div className=" w-full py-[23px] md:py-4 lg:py-[25px]">
        <h1 className="text-center text-2xl font-medium text-dark md:text-4xl">
          Your Voice Notes
        </h1>
      </div>
      <div className="mx-auto mb-10 mt-4 flex h-fit w-[90%] items-center gap-[17px] rounded border border-black bg-white px-[11px] py-[10px] sm:px-[15px] md:mb-[42px] md:w-[623px] md:px-[40px] md:py-[10px]">
        <Image
          src="/icons/search.svg"
          width={27}
          height={26}
          alt="search"
          className="h-5 w-5 md:h-6 md:w-6"
        />
        <form onSubmit={handleSearch} className="w-full">
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            className="w-full text-[16px] outline-none md:text-xl"
          />
        </form>
      </div>
      <div className="h-fit w-full max-w-[1360px] md:px-5 xl:mx-auto">
        {finalNotes &&
          finalNotes.map((item, index) => (
            <RecordedfileItemCard {...item} key={index} onDelete={loadNotes} />
          ))}
        {finalNotes.length === 0 && (
          <div className="flex h-[50vh] w-full items-center justify-center">
            <p className="text-center text-2xl text-dark">
              You currently have no <br /> recordings.
            </p>
          </div>
        )}
      </div>
      <div className="mx-auto mt-[40px] flex h-fit w-full flex-col items-center px-5 pb-10 md:mt-[50px] lg:pb-5">
        <div className="mt-10 flex flex-col gap-6 md:flex-row">
          <Link
            className="rounded-[7px] bg-dark px-[37px] py-[15px] text-[17px] leading-[79%] tracking-[-0.75px] text-light md:text-2xl"
            style={{ boxShadow: ' 0px 4px 4px 0px rgba(0, 0, 0, 0.25)' }}
            href="/record"
          >
            Record a New Voice Note
          </Link>
          {allNotes && (
            <Link
              className="rounded-[7px] px-[37px] py-[15px] text-[17px] leading-[79%] tracking-[-0.75px] md:text-2xl"
              style={{ boxShadow: ' 0px 4px 4px 0px rgba(0, 0, 0, 0.25)' }}
              href="/dashboard/action-items"
            >
              View Action Items
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

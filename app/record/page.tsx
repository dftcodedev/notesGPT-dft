'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentFormattedDate } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const RecordVoicePage = () => {
  const [title, setTitle] = useState('Record your voice note');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user);
    });
  }, []);

  async function startRecording() {
    setIsRunning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let audioChunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });

      const fileName = `${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBlob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName);

      if (user) {
        const { data: noteData, error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            audio_file_url: publicUrl,
            generating_transcript: true,
            generating_title: true,
            generating_action_items: true,
          })
          .select()
          .single();

        if (noteData) {
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transcribe-audio`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioUrl: publicUrl, noteId: noteData.id }),
          }).then(async (response) => {
            const { transcript, noteId } = await response.json();

            await supabase
              .from('notes')
              .update({
                transcription: transcript,
                generating_transcript: false,
              })
              .eq('id', noteId);

            const processResponse = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-note`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcript, noteId }),
              }
            );

            const { title, summary, actionItems } = await processResponse.json();

            await supabase
              .from('notes')
              .update({
                title,
                summary,
                generating_title: false,
              })
              .eq('id', noteId);

            for (const item of actionItems) {
              await supabase.from('action_items').insert({
                note_id: noteId,
                user_id: user.id,
                task: item,
              });
            }

            await supabase
              .from('notes')
              .update({ generating_action_items: false })
              .eq('id', noteId);

            const embedResponse = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: transcript, noteId }),
              }
            );

            const { embedding } = await embedResponse.json();

            await supabase
              .from('notes')
              .update({ embedding })
              .eq('id', noteId);
          });

          router.push(`/recording/${noteData.id}`);
        }
      }
    };
    setMediaRecorder(recorder);
    recorder.start();
  }

  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRunning(false);
    }
  }

  const formattedDate = getCurrentFormattedDate();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setTotalSeconds((prevTotalSeconds) => prevTotalSeconds + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  function formatTime(time: number): string {
    return time < 10 ? `0${time}` : `${time}`;
  }

  const handleRecordClick = () => {
    if (title === 'Record your voice note') {
      setTitle('Recording...');
      startRecording();
    } else if (title === 'Recording...') {
      setTitle('Processing...');
      stopRecording();
    }
  };

  return (
    <div className=" flex flex-col items-center justify-between">
      <h1 className="pt-[25px] text-center text-xl font-medium text-dark md:pt-[47px] md:text-4xl">
        {title}
      </h1>
      <p className="mb-20 mt-4 text-gray-400">{formattedDate}</p>
      <div className="relative mx-auto flex h-[316px] w-[316px] items-center justify-center">
        <div
          className={`recording-box absolute h-full w-full rounded-[50%] p-[12%] pt-[17%] ${
            title !== 'Record your voice note' && title !== 'Processing...'
              ? 'record-animation'
              : ''
          }`}
        >
          <div
            className="h-full w-full rounded-[50%]"
            style={{ background: 'linear-gradient(#E31C1CD6, #003EB6CC)' }}
          />
        </div>
        <div className="z-50 flex h-fit w-fit flex-col items-center justify-center">
          <h1 className="text-[60px] leading-[114.3%] tracking-[-1.5px] text-light">
            {formatTime(Math.floor(totalSeconds / 60))}:
            {formatTime(totalSeconds % 60)}
          </h1>
        </div>
      </div>
      <div className="mt-10 flex w-fit items-center justify-center gap-[33px] pb-7 md:gap-[77px] ">
        <button
          onClick={handleRecordClick}
          className="mt-10 h-fit w-fit rounded-[50%] border-[2px]"
          style={{ boxShadow: '0px 0px 8px 5px rgba(0,0,0,0.3)' }}
        >
          {!isRunning ? (
            <Image
              src={'/icons/nonrecording_mic.svg'}
              alt="recording mic"
              width={148}
              height={148}
              className="h-[70px] w-[70px] md:h-[100px] md:w-[100px]"
            />
          ) : (
            <Image
              src={'/icons/recording_mic.svg'}
              alt="recording mic"
              width={148}
              height={148}
              className="h-[70px] w-[70px] animate-pulse transition md:h-[100px] md:w-[100px]"
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default RecordVoicePage;

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranscribeRequest {
  audioUrl: string;
  noteId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { audioUrl, noteId }: TranscribeRequest = await req.json();

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      throw new Error("TOGETHER_API_KEY not configured");
    }

    const formData = new FormData();
    formData.append("file", audioUrl);
    formData.append("model", "openai/whisper-large-v3");
    formData.append("language", "en");

    const response = await fetch("https://api.together.xyz/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${togetherApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    const transcript = result.text || "error";

    return new Response(
      JSON.stringify({ transcript, noteId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

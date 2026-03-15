import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessNoteRequest {
  transcript: string;
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
    const { transcript, noteId }: ProcessNoteRequest = await req.json();

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      throw new Error("TOGETHER_API_KEY not configured");
    }

    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct-Turbo",
        messages: [
          {
            role: "system",
            content: 'The following is a transcript of a voice message. Extract a title, summary, and action items from it and answer in JSON in this format: {"title": "string", "summary": "string", "actionItems": ["string", "string", ...]}',
          },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Processing failed: ${errorText}`);
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    const title = content.title || "Untitled";
    const summary = content.summary || "Summary failed to generate";
    const actionItems = content.actionItems || [];

    return new Response(
      JSON.stringify({ title, summary, actionItems, noteId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        title: "Title",
        summary: "Summary failed to generate",
        actionItems: []
      }),
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmbeddingRequest {
  text: string;
  noteId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, noteId }: EmbeddingRequest = await req.json();

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      throw new Error("TOGETHER_API_KEY not configured");
    }

    const response = await fetch("https://api.together.xyz/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [text.replace(/\n/g, " ")],
        model: "togethercomputer/m2-bert-80M-32k-retrieval",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding generation failed: ${errorText}`);
    }

    const result = await response.json();
    const embedding = result.data[0].embedding;

    return new Response(
      JSON.stringify({ embedding, noteId }),
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

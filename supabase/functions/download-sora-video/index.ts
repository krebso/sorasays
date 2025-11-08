import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    console.log('Downloading video:', videoId);

    // Download the video from OpenAI
    const downloadResponse = await fetch(
      `https://api.openai.com/v1/videos/${videoId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      const error = await downloadResponse.text();
      console.error('Download error:', error);
      throw new Error('Failed to download video');
    }

    // Stream the video directly to the client
    return new Response(downloadResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'video/mp4',
      },
    });
  } catch (error) {
    console.error('Error in download-sora-video function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

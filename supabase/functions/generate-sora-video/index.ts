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
    const { prompt } = await req.json();

    console.log('Generating video with Sora API for prompt:', prompt);

    // Step 1: Create the video generation request
    const createResponse = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-1.0-turbo',
        prompt: prompt,
        size: '480p',
        duration: 5,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Sora API error:', error);
      throw new Error(`Sora API error: ${createResponse.status} - ${error}`);
    }

    const createData = await createResponse.json();
    const generationId = createData.id;

    console.log('Video generation started, ID:', generationId);

    // Step 2: Poll for completion
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await fetch(
        `https://api.openai.com/v1/videos/generations/${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error('Status check failed:', await statusResponse.text());
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Status check ${attempts}:`, statusData.status);

      if (statusData.status === 'completed') {
        videoUrl = statusData.output?.url;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error('Video generation failed');
      }
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    console.log('Video generated successfully:', videoUrl);

    // Step 3: Download the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download video');
    }

    const videoBlob = await videoResponse.arrayBuffer();
    const base64Video = btoa(String.fromCharCode(...new Uint8Array(videoBlob)));

    return new Response(
      JSON.stringify({ 
        videoBase64: base64Video,
        videoUrl: videoUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-sora-video function:', error);
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

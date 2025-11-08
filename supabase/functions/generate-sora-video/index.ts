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
    const formData = new FormData();
    formData.append('model', 'sora-2');
    formData.append('prompt', prompt);
    formData.append('size', '480x640');
    formData.append('seconds', '4');

    const createResponse = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Sora API error:', error);
      throw new Error(`Sora API error: ${createResponse.status} - ${error}`);
    }

    const createData = await createResponse.json();
    const videoId = createData.id;

    console.log('Video generation started, ID:', videoId);

    // Step 2: Poll for completion
    let videoData = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)

    while (!videoData && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await fetch(
        `https://api.openai.com/v1/videos/${videoId}`,
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
      console.log(`Status check ${attempts}:`, statusData.status, `Progress: ${statusData.progress || 0}%`);

      if (statusData.status === 'completed') {
        videoData = statusData;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error('Video generation failed');
      }
    }

    if (!videoData) {
      throw new Error('Video generation timed out');
    }

    console.log('Video generated successfully');

    // Step 3: Get the download URL
    const downloadResponse = await fetch(
      `https://api.openai.com/v1/videos/${videoId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      throw new Error('Failed to get video download URL');
    }

    // Get the video blob
    const videoBlob = await downloadResponse.arrayBuffer();
    const base64Video = btoa(String.fromCharCode(...new Uint8Array(videoBlob)));

    return new Response(
      JSON.stringify({ 
        videoBase64: base64Video,
        videoId: videoId
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


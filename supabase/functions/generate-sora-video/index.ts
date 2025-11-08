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
    const { prompt, referenceImageBase64, referenceImageType } = await req.json();

    // Validate and sanitize prompt
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt');
    }

    const sanitizedPrompt = prompt.trim().slice(0, 4000);
    
    if (!sanitizedPrompt) {
      throw new Error('Prompt cannot be empty');
    }

    console.log('=================================');
    console.log('SORA VIDEO GENERATION REQUEST');
    console.log('=================================');
    console.log('Prompt:', sanitizedPrompt);
    console.log('Has reference image:', !!referenceImageBase64);
    console.log('Size: 720x1280 (portrait)');
    console.log('Duration: 4 seconds');
    console.log('=================================');
    
    // Step 1: Create the video generation request
    const formData = new FormData();
    formData.append('model', 'sora-2');
    formData.append('prompt', sanitizedPrompt);
    formData.append('size', '720x1280');  // Smallest vertical format (portrait)
    formData.append('seconds', '4');
    
    // Convert and add reference image if provided
    if (referenceImageBase64 && referenceImageType) {
      console.log('Converting reference image to blob, type:', referenceImageType);
      
      // Convert base64 to blob
      const base64Response = await fetch(`data:${referenceImageType};base64,${referenceImageBase64}`);
      const imageBlob = await base64Response.blob();
      
      // Determine file extension from MIME type
      const fileExtension = referenceImageType.split('/')[1] || 'jpg';
      
      console.log('Reference image converted, appending to form');
      formData.append('input_reference', imageBlob, `reference.${fileExtension}`);
    }

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
      console.log(`Status check ${attempts}:`, JSON.stringify(statusData, null, 2));

      if (statusData.status === 'completed') {
        videoData = statusData;
        break;
      } else if (statusData.status === 'failed') {
        const errorMsg = statusData.error?.message || statusData.failure_reason || 'Unknown failure';
        console.error('Video generation failed:', errorMsg);
        throw new Error(`Video generation failed: ${errorMsg}`);
      }
    }

    if (!videoData) {
      throw new Error('Video generation timed out');
    }

    console.log('Video generated successfully');

    // Return the video ID so the frontend can download it
    // Note: We don't convert to base64 because video files are too large
    return new Response(
      JSON.stringify({ 
        videoId: videoId,
        status: 'completed'
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


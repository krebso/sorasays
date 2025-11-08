import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoBase64 } = await req.json();

    console.log('Converting video to GIF');

    // Decode base64 video
    const videoData = Uint8Array.from(atob(videoBase64), c => c.charCodeAt(0));

    // For now, we'll use FFmpeg via a subprocess
    // This requires FFmpeg to be available in the Deno environment
    // Note: This is a simplified version - in production, you might want to use
    // a dedicated video processing service or library

    // Create temporary files
    const tempVideoPath = `/tmp/video_${Date.now()}.mp4`;
    const tempGifPath = `/tmp/gif_${Date.now()}.gif`;

    await Deno.writeFile(tempVideoPath, videoData);

    // Run FFmpeg to convert video to GIF
    const command = new Deno.Command("ffmpeg", {
      args: [
        "-i", tempVideoPath,
        "-vf", "fps=15,scale=480:-1:flags=lanczos",
        "-c:v", "gif",
        tempGifPath
      ],
    });

    const { code, stderr } = await command.output();

    if (code !== 0) {
      const errorString = new TextDecoder().decode(stderr);
      console.error('FFmpeg error:', errorString);
      throw new Error('Video to GIF conversion failed');
    }

    // Read the generated GIF
    const gifData = await Deno.readFile(tempGifPath);
    const base64Gif = btoa(String.fromCharCode(...gifData));

    // Clean up temporary files
    await Deno.remove(tempVideoPath);
    await Deno.remove(tempGifPath);

    console.log('GIF conversion completed successfully');

    return new Response(
      JSON.stringify({ gifBase64: base64Gif }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in convert-to-gif function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If FFmpeg is not available, return a helpful error
    if (errorMessage.includes('ffmpeg')) {
      return new Response(
        JSON.stringify({ 
          error: 'Video processing is not available. Please use the video URL directly.',
          fallbackToVideo: true 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

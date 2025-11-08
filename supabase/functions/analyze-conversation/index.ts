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
    const { imageBase64, tone, customInstruction } = await req.json();

    // Validate inputs
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('Invalid image data');
    }

    const validTones = ['sarcastic', 'wholesome', 'savage', 'helpful', 'chaotic'];
    if (!tone || !validTones.includes(tone)) {
      throw new Error('Invalid tone selection');
    }

    // Sanitize and validate custom instruction
    const sanitizedInstruction = typeof customInstruction === 'string' 
      ? customInstruction.trim().slice(0, 500) 
      : '';

    console.log('Analyzing conversation with tone:', tone);

    const systemPrompt = `You are given a screenshot of a conversation that likely left the recipient unable to formulate an appropriate response. Your task is to generate a funny, creative GIF/video idea that could be used as a reply to this sequence of messages.

User wants the tone of the gif: ${tone}

User's custom instructions: ${sanitizedInstruction || 'None'}

CRITICAL REQUIREMENTS:
- The video MUST be SILENT (no audio/sound effects)
- Any text or dialogue MUST be drawn/displayed visually in the frame (like subtitles or text overlays)
- Never mention audio, sound effects, or spoken words - only describe visual text
- Focus on visual action, emotion, and humor
- Scene should be 3-5 seconds long

Generate a detailed, vivid description of a short silent video scene that would make a perfect response GIF. Be specific about visual elements, character actions, and any text that appears on screen.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              },
              {
                type: 'text',
                text: 'Based on this conversation screenshot, generate a perfect response GIF idea.'
              }
            ]
          }
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const gifPrompt = data.choices[0].message.content;

    console.log('Generated GIF prompt:', gifPrompt);

    return new Response(
      JSON.stringify({ gifPrompt }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-conversation function:', error);
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

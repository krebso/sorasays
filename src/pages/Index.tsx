import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GifGenerator } from "@/components/GifGenerator";

import { ToneSelector } from "@/components/ToneSelector";

export type Tone = "sarcastic" | "wholesome" | "savage" | "helpful" | "chaotic";

const Index = () => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [selectedTone, setSelectedTone] = useState<Tone>("sarcastic");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGif, setGeneratedGif] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setScreenshot(file);
      toast.success("Screenshot uploaded!");
    }
  };

  const handleGenerate = async () => {
    if (!screenshot) {
      toast.error("Please upload a screenshot first!");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(screenshot);
      });

      // Step 1: Analyze conversation and get GIF prompt
      toast.info("Analyzing conversation...");
      
      const { data: promptData, error: promptError } = await supabase.functions.invoke(
        'analyze-conversation',
        {
          body: {
            imageBase64,
            tone: selectedTone,
            customInstruction,
          },
        }
      );

      if (promptError || !promptData?.gifPrompt) {
        throw new Error(promptError?.message || 'Failed to generate prompt');
      }

      // Step 2: Generate video with Sora
      toast.info("Generating video with AI...");
      const { data: videoData, error: videoError } = await supabase.functions.invoke(
        'generate-sora-video',
        {
          body: {
            prompt: promptData.gifPrompt,
          },
        }
      );

      if (videoError || !videoData?.videoId) {
        throw new Error(videoError?.message || 'Failed to generate video');
      }

      // Step 3: Download the video
      toast.info("Downloading video...");

      const downloadResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-sora-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ videoId: videoData.videoId }),
        }
      );

      if (!downloadResp.ok) {
        const t = await downloadResp.text();
        throw new Error(t || 'Failed to download video');
      }

      const videoBlob = await downloadResp.blob();
      
      // Show video preview immediately
      const videoBlobUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoBlobUrl);
      setIsGenerating(false);
      toast.success("Video ready! Converting to GIF...");
      
      // Step 4: Convert to GIF in background
      setIsConverting(true);
      toast.info("Loading converter (first time may take 30s)...");
      
      // Convert on backend to avoid browser worker/MIME issues
      const videoBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(videoBlob);
      });

      const { data: convData, error: convError } = await supabase.functions.invoke(
        'convert-to-gif',
        { body: { videoBase64 } }
      );
      if (convError || !convData?.gifBase64) {
        throw new Error(convError?.message || 'GIF conversion failed');
      }

      const gifBytes = Uint8Array.from(atob(convData.gifBase64), c => c.charCodeAt(0));
      const gifBlob = new Blob([gifBytes], { type: 'image/gif' });
      const gifUrl = URL.createObjectURL(gifBlob);
      setGeneratedGif(gifUrl);
      setIsConverting(false);
      toast.success("GIF conversion complete!");
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate GIF");
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in duration-500">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            SoraSays
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Turn awkward conversations into hilarious response GIFs ✨
          </p>
        </div>

        {!generatedGif && !videoUrl ? (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500">
            {/* Upload Section */}
            <div className="bg-card rounded-3xl p-8 shadow-card mb-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6 text-primary" />
                Upload Conversation Screenshot
              </h2>
              
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {screenshot ? (
                    <div className="space-y-2">
                      <div className="text-primary font-semibold">{screenshot.name}</div>
                      <div className="text-sm text-muted-foreground">Click to change</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div className="text-muted-foreground">
                        Click to upload or drag and drop
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Tone Selection */}
            <div className="bg-card rounded-3xl p-8 shadow-card mb-6">
              <h2 className="text-2xl font-bold mb-6">Select Your Vibe</h2>
              <ToneSelector selectedTone={selectedTone} onToneChange={setSelectedTone} />
            </div>

            {/* Custom Instructions */}
            <div className="bg-card rounded-3xl p-8 shadow-card mb-6">
              <h2 className="text-2xl font-bold mb-4">Custom Instructions (Optional)</h2>
              <Textarea
                placeholder="Add any specific details about how you want your GIF to look..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[100px] resize-none"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {customInstruction.length}/500 characters
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!screenshot || isGenerating}
              className="w-full h-14 text-lg font-semibold shadow-playful hover:scale-[1.02] transition-transform"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Response GIF
                </>
              )}
            </Button>
          </div>
        ) : (
          <GifGenerator
            gifUrl={generatedGif}
            videoUrl={videoUrl}
            isConverting={isConverting}
            onGenerateNew={() => {
              setGeneratedGif(null);
              setVideoUrl(null);
              setScreenshot(null);
              setCustomInstruction("");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;

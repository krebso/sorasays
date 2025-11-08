import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GifGenerator } from "@/components/GifGenerator";
import { convertVideoToGif } from "@/lib/videoToGif";
import { ToneSelector } from "@/components/ToneSelector";

export type Tone = "sarcastic" | "wholesome" | "savage" | "helpful" | "chaotic";

const Index = () => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [selectedTone, setSelectedTone] = useState<Tone>("sarcastic");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGif, setGeneratedGif] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setReferenceImage(file);
      toast.success("Reference image uploaded!");
    }
  };

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
      
      // Convert reference image to base64 if provided
      let referenceImageBase64 = null;
      if (referenceImage) {
        const refReader = new FileReader();
        referenceImageBase64 = await new Promise<string>((resolve, reject) => {
          refReader.onload = () => {
            const base64 = refReader.result as string;
            resolve(base64.split(',')[1]);
          };
          refReader.onerror = reject;
          refReader.readAsDataURL(referenceImage);
        });
      }
      
      const { data: videoData, error: videoError } = await supabase.functions.invoke(
        'generate-sora-video',
        {
          body: {
            prompt: promptData.gifPrompt,
            referenceImageBase64: referenceImageBase64,
            referenceImageType: referenceImage?.type || null,
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
      toast.success("Video ready! Converting to GIF...");
      
      // Convert to GIF
      setIsConverting(true);
      setIsGenerating(false);
      
      const gifBlob = await convertVideoToGif(videoBlobUrl, (progress) => {
        console.log(`GIF conversion progress: ${progress}%`);
        if (progress < 50) {
          toast.info(`Extracting frames: ${progress * 2}%`);
        } else {
          toast.info(`Encoding GIF: ${(progress - 50) * 2}%`);
        }
      });
      
      const gifUrl = URL.createObjectURL(gifBlob);
      setGeneratedGif(gifUrl);
      setIsConverting(false);
      toast.success("GIF generated successfully!");
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
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-gold bg-clip-text text-transparent">
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

            {/* Reference Image */}
            <div className="bg-card rounded-3xl p-8 shadow-card mb-6">
              <h2 className="text-2xl font-bold mb-6">Reference Image (Optional)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upload an image to inspire the visual style of your GIF
              </p>
              <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageChange}
                  className="hidden"
                  id="reference-upload"
                />
                <label htmlFor="reference-upload" className="cursor-pointer">
                  {referenceImage ? (
                    <div className="space-y-2">
                      <div className="text-primary font-semibold">{referenceImage.name}</div>
                      <div className="text-sm text-muted-foreground">Click to change</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Click to upload reference image
                      </div>
                    </div>
                  )}
                </label>
              </div>
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
              setReferenceImage(null);
              setCustomInstruction("");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;

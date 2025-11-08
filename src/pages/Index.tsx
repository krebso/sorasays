import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GifGenerator } from "@/components/GifGenerator";
import { convertVideoToGif } from "@/lib/videoToGif";
import { ToneSelector } from "@/components/ToneSelector";
import { resizeImage } from "@/lib/imageResize";
import { ImageSearch } from "@/components/ImageSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Tone = "sarcastic" | "wholesome" | "savage" | "helpful" | "chaotic";

const Index = () => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [searchedImageUrl, setSearchedImageUrl] = useState<string | null>(null);
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
      setSearchedImageUrl(null); // Clear searched image when uploading
      toast.success("Reference image uploaded!");
    }
  };

  const handleSearchImageSelect = (imageUrl: string) => {
    setSearchedImageUrl(imageUrl);
    setReferenceImage(null); // Clear uploaded image when selecting from search
    toast.success("Reference image selected!");
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
    
    // First, process reference image if needed
    let referenceImageBase64 = null;
    let referenceImageType = null;
    
    if (referenceImage) {
      toast.info("Processing reference image...");
      try {
        const resized = await resizeImage(referenceImage, 720, 1280);
        referenceImageBase64 = resized.base64;
        referenceImageType = resized.mimeType;
      } catch (error) {
        console.error('Failed to resize image:', error);
        toast.error("Failed to process reference image");
        throw error;
      }
    } else if (searchedImageUrl) {
      toast.info("Processing searched image...");
      try {
        // Fetch the image via backend proxy to avoid CORS issues
        const { data, error } = await supabase.functions.invoke('proxy-image-fetch', {
          body: { url: searchedImageUrl },
        });

        if (error || !data?.base64) {
          throw new Error(error?.message || 'Failed to fetch searched image');
        }

        // Recreate a Blob/File from base64
        const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        const file = new File([blob], "searched-image", { type: data.mimeType || 'image/jpeg' });
        
        // Resize the image
        const resized = await resizeImage(file, 720, 1280);
        referenceImageBase64 = resized.base64;
        referenceImageType = resized.mimeType;
      } catch (error) {
        console.error('Failed to process searched image:', error);
        toast.error("Failed to process searched image");
        throw error;
      }
    }
    
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
            referenceImageBase64,
            referenceImageType,
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
            referenceImageBase64: referenceImageBase64,
            referenceImageType: referenceImageType,
          },
        }
      );

      if (videoError || !videoData?.videoId) {
        console.error('Video generation error:', videoError);
        const errorMsg = videoError?.message || 'Failed to generate video';
        
        // Check for moderation block
        if (errorMsg.includes('moderation') || errorMsg.includes('blocked')) {
          toast.error("Content blocked by AI safety filters. Try a different conversation or tone!");
        } else {
          toast.error(errorMsg);
        }
        throw new Error(errorMsg);
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6 animate-in fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-gold bg-clip-text text-transparent">
            SoraSays
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn awkward conversations into hilarious response GIFs ✨
          </p>
        </div>

        {!generatedGif && !videoUrl ? (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500">
            {/* Upload Section */}
            <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload Conversation Screenshot
              </h2>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button 
                  type="button"
                  variant={screenshot ? "secondary" : "outline"}
                  className="w-full"
                  asChild
                >
                  <span className="cursor-pointer">
                    {screenshot ? (
                      <>
                        <Upload className="w-4 h-4" />
                        {screenshot.name}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choose Screenshot
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            {/* Tone Selection */}
            <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
              <h2 className="text-lg font-bold mb-3">Select Your Vibe</h2>
              <ToneSelector selectedTone={selectedTone} onToneChange={setSelectedTone} />
            </div>

            {/* Reference Image */}
            <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Reference Image (Optional)
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Search or upload an image to inspire the visual style of your GIF
              </p>
              
              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Search</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="search" className="mt-3">
                  <ImageSearch
                    onImageSelect={handleSearchImageSelect}
                    selectedImageUrl={searchedImageUrl}
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageChange}
                    className="hidden"
                    id="reference-upload"
                  />
                  <label htmlFor="reference-upload">
                    <Button 
                      type="button"
                      variant={referenceImage ? "secondary" : "outline"}
                      className="w-full"
                      asChild
                    >
                      <span className="cursor-pointer">
                        {referenceImage ? (
                          <>
                            <Upload className="w-4 h-4" />
                            {referenceImage.name}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Choose Reference Image
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </TabsContent>
              </Tabs>
            </div>

            {/* Custom Instructions */}
            <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
              <h2 className="text-lg font-bold mb-2">Custom Instructions (Optional)</h2>
              <Textarea
                placeholder="Add any specific details about how you want your GIF to look..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[70px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {customInstruction.length}/500 characters
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!screenshot || isGenerating}
              className="w-full h-12 text-base font-semibold shadow-playful hover:scale-[1.02] transition-transform"
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
              setSearchedImageUrl(null);
              setCustomInstruction("");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;

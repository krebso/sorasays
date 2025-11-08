import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GifGenerator } from "@/components/GifGenerator";
import { ToneSelector } from "@/components/ToneSelector";

export type Tone = "sarcastic" | "wholesome" | "savage" | "helpful" | "chaotic";

const Index = () => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [selectedTone, setSelectedTone] = useState<Tone>("sarcastic");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGif, setGeneratedGif] = useState<string | null>(null);

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
      // This will be implemented with the actual API calls
      toast.info("Generating your response GIF...");
      
      // Placeholder for now - will integrate OpenAI and Sora APIs
      setTimeout(() => {
        toast.success("GIF generated successfully!");
        setGeneratedGif("placeholder-gif-url");
        setIsGenerating(false);
      }, 3000);
    } catch (error) {
      toast.error("Failed to generate GIF");
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

        {!generatedGif ? (
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
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="min-h-[100px] resize-none"
              />
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
            onGenerateNew={() => {
              setGeneratedGif(null);
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

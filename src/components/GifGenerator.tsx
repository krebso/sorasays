import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GifGeneratorProps {
  gifUrl: string | null;
  videoUrl: string | null;
  isConverting: boolean;
  onGenerateNew: () => void;
}

export const GifGenerator = ({ gifUrl, videoUrl, isConverting, onGenerateNew }: GifGeneratorProps) => {
  const displayUrl = gifUrl || videoUrl;
  const isVideo = !gifUrl && !!videoUrl;
  
  if (!displayUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(displayUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sorasays-${Date.now()}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('GIF downloaded!');
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };


  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {isVideo ? 'Converting to GIF...' : 'Your Response GIF is Ready! 🎉'}
        </h2>
        
        {isConverting && (
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground">
              ⚙️ Converting video to GIF... This may take a minute!
            </p>
          </div>
        )}
        
        {/* GIF/Video Preview */}
        <div className="rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <video
              src={displayUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              preload="metadata"
              className="w-full rounded-2xl"
            />
          ) : (
            <img
              src={displayUrl}
              alt="Generated GIF"
              className="w-full rounded-2xl"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {!isVideo && (
            <Button
              onClick={handleDownload}
              className="flex-1 h-12 shadow-playful"
            >
              <Download className="w-5 h-5 mr-2" />
              Download GIF
            </Button>
          )}
          
          <Button
            onClick={onGenerateNew}
            variant="outline"
            className="h-12"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            New GIF
          </Button>
        </div>
        
        {isVideo && !isConverting && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            💡 Preview while we convert to GIF format
          </p>
        )}
      </div>
    </div>
  );
};

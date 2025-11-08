import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GifGeneratorProps {
  videoUrl: string | null;
  onGenerateNew: () => void;
}

export const GifGenerator = ({ videoUrl, onGenerateNew }: GifGeneratorProps) => {
  const displayUrl = videoUrl;
  
  if (!displayUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(displayUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sorasays-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Video downloaded!');
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };

  const handleCopy = async () => {
    // Videos can't be copied to clipboard
    toast.error("Videos can't be copied. Please download instead.");
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Your Response Video is Ready! 🎉
        </h2>
        
        {/* Video Preview */}
        <div className="aspect-video bg-muted rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
          <video
            src={displayUrl}
            autoPlay
            loop
            muted
            playsInline
            controls
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleDownload}
            className="flex-1 h-12 shadow-playful"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Video
          </Button>
          
          <Button
            onClick={onGenerateNew}
            variant="outline"
            className="h-12"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            New Video
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mt-4">
          💡 Videos can't be copied to clipboard - use the download button instead
        </p>
      </div>
    </div>
  );
};

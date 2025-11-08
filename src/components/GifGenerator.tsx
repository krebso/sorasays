import { Download, Copy, RotateCcw } from "lucide-react";
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
      link.download = `sorasays-${Date.now()}.${isVideo ? 'mp4' : 'gif'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${isVideo ? 'Video' : 'GIF'} downloaded!`);
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };

  const handleCopy = async () => {
    if (!gifUrl) {
      toast.error("Please wait for GIF conversion to complete");
      return;
    }
    
    try {
      const response = await fetch(gifUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      toast.success("GIF copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy. Try downloading instead.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {isVideo ? 'Video Preview' : 'Your Response GIF is Ready! 🎉'}
        </h2>
        
        {isConverting && (
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground">
              ⚙️ Converting to GIF... You can preview the video while we work!
            </p>
          </div>
        )}
        
        {/* GIF/Video Preview */}
        <div className="aspect-video bg-muted rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
          {isVideo ? (
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
          ) : (
            <img
              src={displayUrl}
              alt="Generated GIF"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleDownload}
            className="flex-1 h-12 shadow-playful"
          >
            <Download className="w-5 h-5 mr-2" />
            {isVideo ? 'Download Video' : 'Download GIF'}
          </Button>
          
          {!isVideo && (
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="flex-1 h-12"
              disabled={isConverting}
            >
              <Copy className="w-5 h-5 mr-2" />
              {isConverting ? 'Converting...' : 'Copy to Clipboard'}
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
          <p className="text-sm text-muted-foreground text-center mt-2">
            💡 Videos can't be copied to clipboard - use the download button instead
          </p>
        )}
      </div>
    </div>
  );
};

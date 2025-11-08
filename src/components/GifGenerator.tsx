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
    if (!displayUrl || isVideo) {
      toast.error("Videos can't be copied. Please wait for GIF conversion.");
      return;
    }

    try {
      // Fetch the GIF and convert to blob
      const response = await fetch(displayUrl);
      const blob = await response.blob();
      
      // Try to write image to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob.type === 'image/gif' 
              ? await convertGifToPng(blob) 
              : blob
          })
        ]);
        toast.success("GIF copied! Paste it with Ctrl+V");
      } catch (clipError) {
        // Fallback: copy URL if image clipboard isn't supported
        await navigator.clipboard.writeText(displayUrl);
        toast.success("GIF link copied to clipboard!");
      }
    } catch (error) {
      toast.error("Failed to copy. Try downloading instead.");
      console.error(error);
    }
  };

  // Convert GIF to PNG for better clipboard compatibility
  const convertGifToPng = async (gifBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(gifBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not convert to PNG'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load image'));
      };
      
      img.src = url;
    });
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
              Copy GIF
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

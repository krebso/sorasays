import { Download, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GifGeneratorProps {
  gifUrl: string;
  onGenerateNew: () => void;
}

export const GifGenerator = ({ gifUrl, onGenerateNew }: GifGeneratorProps) => {
  const isBlob = gifUrl.startsWith('blob:');
  const isBase64 = gifUrl.startsWith('data:');
  const isVideo = isBlob || gifUrl.includes('.mp4') || (gifUrl.startsWith('http') && !gifUrl.endsWith('.gif'));

  const handleDownload = async () => {
    try {
      if (isBase64) {
        // Download base64 GIF
        const link = document.createElement('a');
        link.href = gifUrl;
        link.download = `sorasays-${Date.now()}.gif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("GIF downloaded!");
      } else {
        // Download from URL
        const response = await fetch(gifUrl);
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
      }
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };

  const handleCopy = async () => {
    try {
      // Always fetch and copy the actual blob data
      const response = await fetch(gifUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      toast.success(isVideo ? "Video copied to clipboard!" : "GIF copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy. Try downloading instead.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card">
        <h2 className="text-3xl font-bold mb-6 text-center">Your Response GIF is Ready! 🎉</h2>
        
        {/* GIF/Video Preview */}
        <div className="aspect-video bg-muted rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <video
               src={gifUrl}
               autoPlay
               loop
               muted
               playsInline
               controls
               preload="metadata"
               className="w-full h-full object-contain"
             />
          ) : isBase64 ? (
            <img
              src={gifUrl}
              alt="Generated GIF"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2">🎬</div>
              <p>Loading preview...</p>
            </div>
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
          
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="flex-1 h-12"
          >
            <Copy className="w-5 h-5 mr-2" />
            Copy to Clipboard
          </Button>
          
          <Button
            onClick={onGenerateNew}
            variant="outline"
            className="h-12"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            New GIF
          </Button>
        </div>
      </div>
    </div>
  );
};

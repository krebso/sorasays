import { Download, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GifGeneratorProps {
  gifUrl: string;
  onGenerateNew: () => void;
}

export const GifGenerator = ({ gifUrl, onGenerateNew }: GifGeneratorProps) => {
  const handleDownload = () => {
    // Placeholder - will implement actual download
    toast.success("GIF downloaded!");
  };

  const handleCopy = () => {
    // Placeholder - will implement clipboard copy
    toast.success("GIF copied to clipboard!");
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card">
        <h2 className="text-3xl font-bold mb-6 text-center">Your Response GIF is Ready! 🎉</h2>
        
        {/* GIF Preview */}
        <div className="aspect-video bg-muted rounded-2xl mb-6 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🎬</div>
            <p>GIF Preview</p>
            <p className="text-sm">Video conversion in progress...</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleDownload}
            className="flex-1 h-12 shadow-playful"
          >
            <Download className="w-5 h-5 mr-2" />
            Download GIF
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

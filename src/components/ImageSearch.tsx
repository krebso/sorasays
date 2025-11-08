import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageSearchProps {
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl: string | null;
}

interface SearchResult {
  filename: string;
  filepath: string;
  similarity: string;
  distance: number;
  imageUrl: string;
}

export const ImageSearch = ({ onImageSelect, selectedImageUrl }: ImageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('proxy-image-search', {
        body: { prompt: searchQuery }
      });

      if (error) {
        throw new Error(error.message || "Search failed");
      }

      setSearchResults(data.results || []);
      
      if (data.results?.length === 0) {
        toast.info("No images found. Try a different search term.");
      } else {
        toast.success(`Found ${data.results.length} images`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search images. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search for images (e.g., 'dog', 'sunset')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          variant="outline"
          size="default"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto p-1">
          {searchResults.map((result) => (
            <button
              key={result.filepath}
              onClick={() => onImageSelect(result.imageUrl)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                selectedImageUrl === result.imageUrl
                  ? "border-primary shadow-playful"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={result.imageUrl}
                alt={result.filename}
                className="w-full h-full object-cover"
              />
              {selectedImageUrl === result.imageUrl && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

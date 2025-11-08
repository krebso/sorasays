import { Smile, Heart, Flame, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/pages/Index";

interface ToneSelectorProps {
  selectedTone: Tone;
  onToneChange: (tone: Tone) => void;
}

const tones: { value: Tone; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "sarcastic", label: "Sarcastic", icon: <Smile />, color: "bg-primary" },
  { value: "wholesome", label: "Wholesome", icon: <Heart />, color: "bg-secondary" },
  { value: "savage", label: "Savage", icon: <Flame />, color: "bg-destructive" },
  { value: "helpful", label: "Helpful", icon: <Lightbulb />, color: "bg-accent" },
  { value: "chaotic", label: "Chaotic", icon: <Zap />, color: "bg-primary" },
];

export const ToneSelector = ({ selectedTone, onToneChange }: ToneSelectorProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {tones.map((tone) => (
        <button
          key={tone.value}
          onClick={() => onToneChange(tone.value)}
          className={cn(
            "group relative p-6 rounded-2xl border-2 transition-all hover:scale-105",
            selectedTone === tone.value
              ? "border-primary bg-primary/10 shadow-playful"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                selectedTone === tone.value ? tone.color : "bg-muted",
                "text-white"
              )}
            >
              {tone.icon}
            </div>
            <span className="font-semibold text-sm">{tone.label}</span>
          </div>
          
          {selectedTone === tone.value && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

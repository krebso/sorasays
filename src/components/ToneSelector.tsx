import { cn } from "@/lib/utils";
import type { Tone } from "@/pages/Index";

interface ToneSelectorProps {
  selectedTone: Tone;
  onToneChange: (tone: Tone) => void;
}

const tones: { value: Tone; label: string }[] = [
  { value: "sarcastic", label: "Sarcastic" },
  { value: "wholesome", label: "Wholesome" },
  { value: "savage", label: "Savage" },
  { value: "helpful", label: "Helpful" },
  { value: "chaotic", label: "Chaotic" },
];

export const ToneSelector = ({ selectedTone, onToneChange }: ToneSelectorProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {tones.map((tone) => (
        <button
          key={tone.value}
          onClick={() => onToneChange(tone.value)}
          className={cn(
            "group relative p-3 rounded-xl border-2 transition-all hover:scale-105",
            selectedTone === tone.value
              ? "border-primary bg-primary/10 shadow-playful"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <span className="font-semibold text-xs">{tone.label}</span>
          
          {selectedTone === tone.value && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

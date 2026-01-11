import { MicrophoneIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils";

type MuteToggleButtonProps = {
  isMuted: boolean;
  onToggle: () => void;
};

export function MuteToggleButton({ isMuted, onToggle }: MuteToggleButtonProps) {
  return (
    <Button
      type="button"
      variant={isMuted ? "destructive" : "secondary"}
      className={cn(
        "h-10.5 flex items-center justify-center gap-2 rounded-full px-4 transition-all duration-200 shadow-md hover:shadow-lg",
        isMuted
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-slate-800 text-white hover:bg-slate-900",
      )}
      onClick={onToggle}
    >
      {isMuted ? (
        <>
          <span className="relative inline-flex items-center justify-center">
            <MicrophoneIcon className="w-5 h-5" />
            <span className="pointer-events-none absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rotate-45 bg-current" />
          </span>
          <span>Unmute</span>
        </>
      ) : (
        <>
          <MicrophoneIcon className="w-5 h-5" />
          <span>Mute</span>
        </>
      )}
    </Button>
  );
}

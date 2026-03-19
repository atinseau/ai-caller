import { Loader2 } from "lucide-react";
import { cn } from "@/shared/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = { sm: "size-4", md: "size-6", lg: "size-8" };

export function LoadingSpinner({
  className,
  size = "md",
  label,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeMap[size])}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

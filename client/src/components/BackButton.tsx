import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "" }: BackButtonProps) {
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
      data-testid="button-back"
    >
      <ArrowRight className="h-4 w-4" />
      رجوع
    </Button>
  );
}

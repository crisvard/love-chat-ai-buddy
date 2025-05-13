
import { toast as sonnerToast } from "sonner";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function toast({
  title,
  description,
  variant = "default",
  duration = 5000,
  action,
}: ToastProps) {
  let type: "default" | "success" | "error" | "warning" | "info" = "default";

  switch (variant) {
    case "destructive":
      type = "error";
      break;
    case "success":
      type = "success";
      break;
    case "warning":
      type = "warning";
      break;
    case "info":
      type = "info";
      break;
  }

  return sonnerToast(title, {
    description: description,
    duration: duration,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
    position: "bottom-right",
    type,
  });
}

export function useToast() {
  return {
    toast,
  };
}

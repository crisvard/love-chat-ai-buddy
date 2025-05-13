
import { toast as sonnerToast, useToaster } from "sonner";

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
  // Mapeando variantes do nosso sistema para variantes do sonner
  let variantType:
    | "default"
    | "success"
    | "error"
    | "warning"
    | "info" = "default";

  switch (variant) {
    case "destructive":
      variantType = "error";
      break;
    case "success":
      variantType = "success";
      break;
    case "warning":
      variantType = "warning";
      break;
    case "info":
      variantType = "info";
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
    // Usando a propriedade correta do sonner compatível com ExternalToast
    // @ts-expect-error - O tipo ExternalToast não está bem definido na lib
    variant: variantType,
  });
}

export function useToast() {
  // Obtemos o estado atual dos toasts do sonner
  const { toasts } = useToaster();
  
  return {
    toast,
    toasts: toasts || [], // Garantimos que sempre retornará um array, mesmo que seja vazio
  };
}

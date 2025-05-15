
import { useToast as useToastOriginal, toast as toastOriginal } from "@/components/ui/toast";

export const useToast = useToastOriginal;
export const toast = toastOriginal;

// Re-export para compatibilidade com importações anteriores
export default {
  useToast: useToastOriginal,
  toast: toastOriginal
};

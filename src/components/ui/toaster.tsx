
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Esta verificação ainda é útil para garantir que não haja erros de renderização
  if (!toasts || !Array.isArray(toasts)) {
    return (
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    )
  }

  // Como estamos usando o componente Toaster da sonner em App.tsx,
  // este componente na verdade não exibirá os toasts, mas mantemos para compatibilidade
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

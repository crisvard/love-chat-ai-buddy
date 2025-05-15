
import * as React from "react"
import { create } from "zustand"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

type State = {
  toasts: ToasterToast[]
}

export const useToast = create<State>((set) => ({
  toasts: [],
}))

export function toast({
  title,
  description,
  action,
  variant,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}) {
  const id = Math.random().toString(36).substring(2, 9)

  useToast.setState((state) => {
    return {
      toasts: [
        {
          id,
          title,
          description,
          action,
          variant,
        },
        ...state.toasts,
      ].slice(0, TOAST_LIMIT),
    }
  })

  return {
    id,
    dismiss: () => dismiss(id),
    update: (props: ToasterToast) =>
      update({
        ...props,
        id,
      }),
  }
}

function dismiss(toastId: string) {
  useToast.setState((state) => ({
    toasts: state.toasts.filter((t) => t.id !== toastId),
  }))
}

function update(toast: ToasterToast) {
  useToast.setState((state) => ({
    toasts: state.toasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t)),
  }))
}

export default {
  useToast,
  toast,
}

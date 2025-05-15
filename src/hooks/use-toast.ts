
import * as React from "react";
import { create } from "zustand";

const useToastStore = create<{
  toasts: Array<{
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    variant?: "default" | "destructive" | "success";
  }>;
  addToast: (toast: {
    id?: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    variant?: "default" | "destructive" | "success";
  }) => void;
  dismissToast: (id: string) => void;
}>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast.id || String(Date.now());
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

export function useToast() {
  const { toasts, addToast, dismissToast } = useToastStore();

  return {
    toasts,
    toast: (props: {
      title?: React.ReactNode;
      description?: React.ReactNode;
      action?: React.ReactNode;
      variant?: "default" | "destructive" | "success";
    }) => addToast(props),
    dismiss: (id: string) => dismissToast(id),
  };
}

export const toast = useToastStore.getState().addToast;

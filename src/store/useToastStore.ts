

import { create } from 'zustand';
import type { ToastItem, ToastType } from '@/types';
import { generateId } from '@/utils/format';


interface ToastState {
  toasts: ToastItem[];

  showToast: (type: ToastType, message: string, duration?: number) => void;

  dismissToast: (id: string) => void;

  removeToast: (id: string) => void;

  clearAll: () => void;
}


export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (type, message, duration = 3000) => {
    const id = generateId();
    const toast: ToastItem = { id, type, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));


    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },

  dismissToast: (id) => {

    const existing = get().toasts.find((t) => t.id === id);
    if (!existing || existing.leaving) return;
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));

    setTimeout(() => {
      get().removeToast(id);
    }, 200);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearAll: () => {
    set(() => ({ toasts: [] }));
  },
}));


export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().showToast('success', message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().showToast('error', message, duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().showToast('warning', message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().showToast('info', message, duration),
};

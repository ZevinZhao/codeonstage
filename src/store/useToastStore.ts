// ============================================================
// Toast Store - 全局提示管理
// ============================================================
import { create } from 'zustand';
import type { ToastItem, ToastType } from '@/types';
import { generateId } from '@/utils/format';

/** Toast Store 接口 */
interface ToastState {
  toasts: ToastItem[];
  /** 显示 Toast */
  showToast: (type: ToastType, message: string, duration?: number) => void;
  /** 触发退出动画并在结束后移除 */
  dismissToast: (id: string) => void;
  /** 立即移除 Toast（无动画） */
  removeToast: (id: string) => void;
  /** 清空所有 Toast */
  clearAll: () => void;
}

/** Toast Store */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (type, message, duration = 3000) => {
    const id = generateId();
    const toast: ToastItem = { id, type, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    // 自动移除（走退出动画）
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },

  dismissToast: (id) => {
    // 已在退场流程中则跳过（可中断/幂等）
    const existing = get().toasts.find((t) => t.id === id);
    if (!existing || existing.leaving) return;
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));
    // 等退出动画播完再真正移除（与 Toast 组件退场时长一致）
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

/** 便捷方法 */
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
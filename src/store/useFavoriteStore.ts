// ============================================================
// 收藏 Store - Zustand + localStorage 持久化
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Favorite, FavoriteStatus } from '@/types';

/** 收藏 Store 接口 */
interface FavoriteState {
  favorites: Favorite[];
  /** 切换收藏状态（已收藏则移除，未收藏则添加为待试用） */
  toggleFavorite: (skillId: string) => void;
  /** 更新收藏状态 */
  updateStatus: (skillId: string, status: FavoriteStatus) => void;
  /** 更新使用心得 */
  updateNote: (skillId: string, note: string) => void;
  /** 移除收藏 */
  removeFavorite: (skillId: string) => void;
  /** 是否已收藏 */
  isFavorited: (skillId: string) => boolean;
  /** 按状态获取收藏 */
  getByStatus: (status: FavoriteStatus) => Favorite[];
  /** 获取单个收藏 */
  getFavorite: (skillId: string) => Favorite | undefined;
}

/** 收藏 Store */
export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (skillId) => {
        const exists = get().favorites.some((f) => f.skillId === skillId);
        if (exists) {
          set((state) => ({
            favorites: state.favorites.filter((f) => f.skillId !== skillId),
          }));
        } else {
          const newFavorite: Favorite = {
            skillId,
            status: 'wishlist',
            note: '',
            addedAt: new Date().toISOString(),
          };
          set((state) => ({ favorites: [...state.favorites, newFavorite] }));
        }
      },

      updateStatus: (skillId, status) => {
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.skillId === skillId ? { ...f, status } : f
          ),
        }));
      },

      updateNote: (skillId, note) => {
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.skillId === skillId ? { ...f, note } : f
          ),
        }));
      },

      removeFavorite: (skillId) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.skillId !== skillId),
        }));
      },

      isFavorited: (skillId) => {
        return get().favorites.some((f) => f.skillId === skillId);
      },

      getByStatus: (status) => {
        return get().favorites.filter((f) => f.status === status);
      },

      getFavorite: (skillId) => {
        return get().favorites.find((f) => f.skillId === skillId);
      },
    }),
    {
      name: 'vibe-favorites',
      version: 1,
    }
  )
);
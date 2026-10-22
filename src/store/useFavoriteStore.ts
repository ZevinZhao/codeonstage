

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Favorite, FavoriteStatus } from '@/types';


interface FavoriteState {
  favorites: Favorite[];

  toggleFavorite: (skillId: string) => void;

  updateStatus: (skillId: string, status: FavoriteStatus) => void;

  updateNote: (skillId: string, note: string) => void;

  removeFavorite: (skillId: string) => void;

  isFavorited: (skillId: string) => boolean;

  getByStatus: (status: FavoriteStatus) => Favorite[];

  getFavorite: (skillId: string) => Favorite | undefined;
}


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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../lib/types';
import { loginWithPin } from '../lib/supabase/queries';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loginError: string | null;
  isLoggingIn: boolean;
  login: (name: string, pin: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      loginError: null,
      isLoggingIn: false,

      login: async (name, pin) => {
        set({ isLoggingIn: true, loginError: null });
        try {
          const user = await loginWithPin(name, pin);
          if (!user) {
            set({ loginError: 'Invalid name or PIN', isLoggingIn: false });
            return false;
          }
          set({
            isAuthenticated: true,
            currentUser: user,
            loginError: null,
            isLoggingIn: false,
          });
          return true;
        } catch {
          set({ loginError: 'Connection error', isLoggingIn: false });
          return false;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          currentUser: null,
          loginError: null,
        });
      },
    }),
    {
      name: 'nxflow-auth',
      version: 1,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../lib/types';
import { loginWithPin } from '../lib/supabase/queries';
import { createClient } from '../lib/supabase/client';

// Maps nxflow email → Supabase Auth password for the matching auth.users row.
// Populate this as each team member gets their Supabase auth account provisioned.
// If an entry is missing for a given user, the nxflow PIN login still works,
// but the CRM module will require a separate Supabase login.
const SUPABASE_PASSWORDS: Record<string, string> = {
  'berat@alba.com': 'Berat100005!',
};

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

          // Single sign-on: if we know the user's Supabase password, sign them
          // into Supabase Auth as well so the CRM module doesn't re-prompt.
          // Errors are swallowed — nxflow PIN is the source of truth; Supabase
          // is a best-effort side effect for CRM access.
          if (user.email) {
            const password = SUPABASE_PASSWORDS[user.email];
            if (password) {
              try {
                const supabase = createClient();
                await supabase.auth.signInWithPassword({
                  email: user.email,
                  password,
                });
              } catch {
                // ignore — user can still use workspace/SEO; CRM may prompt
              }
            }
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

      logout: async () => {
        // Sign out of Supabase first so CRM session is cleared too.
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
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

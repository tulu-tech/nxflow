import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../lib/types';
import { loginWithPin } from '../lib/supabase/queries';
import { createClient } from '../lib/supabase/client';

// ─── CRM shared Supabase identity ─────────────────────────────────────────
// Every nxflow PIN user signs into Supabase Auth as this single shared user,
// because the Alba team CRM is a shared workspace (one leadboard, one set of
// campaigns, one Lusha credit pool). The nxflow PIN layer already provides
// per-person identity for activity attribution. This keeps the CRM module
// reachable without a second login prompt.
export const CRM_SHARED_EMAIL = 'berat@alba.com';
export const CRM_SHARED_PASSWORD = 'Berat100005!';

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

          // Single sign-on: regardless of which PIN user just logged in,
          // sign into Supabase Auth as the shared CRM identity so the CRM
          // module doesn't prompt for a second login. Errors are swallowed —
          // nxflow PIN is the source of truth; the CRM Supabase session is
          // a best-effort side effect.
          try {
            const supabase = createClient();
            await supabase.auth.signInWithPassword({
              email: CRM_SHARED_EMAIL,
              password: CRM_SHARED_PASSWORD,
            });
          } catch {
            // ignore — user can still use workspace/SEO
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
      // NOTE: Supabase session rehydration on page load is handled by
      // `SupabaseProvider`, which blocks rendering until the CRM session
      // is ready. That removes the race condition where the user clicks
      // the CRM card before signInWithPassword has set the cookie.
    }
  )
);

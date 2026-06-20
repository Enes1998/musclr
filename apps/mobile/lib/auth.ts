import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

interface AuthState {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  init: () => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuth = create<AuthState>((set) => ({
  configured: isSupabaseConfigured,
  ready: !isSupabaseConfigured,
  session: null,
  user: null,
  error: null,
  init: () => {
    if (initialized || !supabase) return;
    initialized = true;
    void supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },
  signInWithPassword: async (email, password) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
  },
  signUp: async (email, password) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message });
  },
  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
}));

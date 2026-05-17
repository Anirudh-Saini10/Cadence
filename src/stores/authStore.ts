import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole, UserRow } from "@/types/database";

interface AuthState {
  session: Session | null;
  profile: UserRow | null;
  /** When set, overrides the *display* role for demo purposes (the "Switch Role" button).
   *  RLS is still enforced by the real session role — we just change which dashboard renders.
   *  Only available to admin users so judges can flip seamlessly. */
  demoRoleOverride: UserRole | null;
  loading: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setDemoRole: (role: UserRole | null) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  demoRoleOverride: null,
  loading: false,
  initialized: false,

  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session });
    if (session) await loadProfile(set);
    set({ initialized: true });

    supabase.auth.onAuthStateChange(async (_event, s) => {
      set({ session: s });
      if (s) await loadProfile(set);
      else set({ profile: null, demoRoleOverride: null });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    await loadProfile(set);
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, demoRoleOverride: null });
  },

  setDemoRole: (role) => {
    // Only admins can override their dashboard view.
    const p = get().profile;
    if (!p || p.role !== "admin") return;
    set({ demoRoleOverride: role });
  },
}));

async function loadProfile(
  set: (partial: Partial<AuthState>) => void
): Promise<void> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id;
  if (!uid) return;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .single();
  if (!error && data) set({ profile: data as UserRow });
}

/** Effective role for routing / dashboard rendering (respects demo override). */
export function useEffectiveRole(): UserRole | null {
  const profile = useAuth((s) => s.profile);
  const override = useAuth((s) => s.demoRoleOverride);
  if (!profile) return null;
  if (profile.role === "admin" && override) return override;
  return profile.role;
}

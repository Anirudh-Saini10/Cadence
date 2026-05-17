import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole, UserRow } from "@/types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserRow | null;
  demoRoleOverride: UserRole | null;
  loading: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setDemoRole: (role: UserRole | null) => void;
}

function getPersistedDemoRole(): UserRole | null {
  try {
    const raw = localStorage.getItem("cadence_demo_role");
    if (raw === "employee" || raw === "manager" || raw === "admin") return raw;
  } catch { /* localStorage unavailable */ }
  return null;
}

function persistDemoRole(role: UserRole | null) {
  try {
    if (role) localStorage.setItem("cadence_demo_role", role);
    else localStorage.removeItem("cadence_demo_role");
  } catch { /* localStorage unavailable */ }
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  demoRoleOverride: getPersistedDemoRole(),
  loading: false,
  initialized: false,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await loadProfile(set, session.user.id);
      set({ session, user: session.user });
    }
    set({ initialized: true });

    supabase.auth.onAuthStateChange(async (_event, s) => {
      if (s?.user) {
        await loadProfile(set, s.user.id);
        set({ session: s, user: s.user });
      } else {
        set({ session: null, user: null, profile: null, demoRoleOverride: null });
        persistDemoRole(null);
      }
      set({ initialized: true });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });

    if (error || !data.session?.user) {
      return { error: error?.message ?? "Sign-in failed" };
    }

    // Set session IMMEDIATELY so navigation to / doesn't bounce back to login
    set({ session: data.session, user: data.session.user });
    await loadProfile(set, data.session.user.id);
    return { error: null };
  },

  signOut: async () => {
    set({ session: null, user: null, profile: null, demoRoleOverride: null });
    persistDemoRole(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[cadence] signOut server call failed", e);
    }
  },

  setDemoRole: (role) => {
    const p = get().profile;
    if (!p || p.role !== "admin") return;
    set({ demoRoleOverride: role });
    persistDemoRole(role);
  },
}));

async function loadProfile(
  set: (partial: Partial<AuthState>) => void,
  uid: string
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .single();
    if (!error && data) {
      set({ profile: data as UserRow });
    } else {
      set({ profile: null });
      // eslint-disable-next-line no-console
      console.warn("[cadence] loadProfile failed:", error?.message);
    }
  } catch (e) {
    set({ profile: null });
    // eslint-disable-next-line no-console
    console.warn("[cadence] loadProfile exception:", e);
  }
}

/** Effective role for routing / dashboard rendering (respects demo override). */
export function useEffectiveRole(): UserRole | null {
  const profile = useAuth((s) => s.profile);
  const override = useAuth((s) => s.demoRoleOverride);
  if (!profile) return null;
  if (profile.role === "admin" && override) return override;
  return profile.role;
}

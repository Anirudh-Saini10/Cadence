import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CycleRow } from "@/types/database";

export function useActiveCycle() {
  return useQuery({
    queryKey: ["active-cycle"],
    queryFn: async (): Promise<CycleRow | null> => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("status", "active")
        .order("open_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CycleRow | null;
    },
  });
}

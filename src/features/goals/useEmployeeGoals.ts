import { useQuery } from "@tanstack/react-query";
import { fetchGoalsFor } from "./goalApi";

export function useEmployeeGoals(employeeId: string | null | undefined, cycleId: string | null | undefined) {
  return useQuery({
    queryKey: ["goals", employeeId, cycleId],
    queryFn: () => fetchGoalsFor(employeeId!, cycleId!),
    enabled: Boolean(employeeId && cycleId),
  });
}

export const goalsQueryKey = (employeeId: string | null | undefined, cycleId: string | null | undefined) =>
  ["goals", employeeId, cycleId] as const;

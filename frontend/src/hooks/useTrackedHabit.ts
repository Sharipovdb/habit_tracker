import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLog, getHabits, getLogs, getStats } from "../api/habits";
import { queryKeys } from "../api/queryKeys";
import type { HabitType } from "../types";

interface UseTrackedHabitOptions {
  habitType: HabitType;
  cacheScope: string;
  includeStats?: boolean;
}

export function useTrackedHabit({
  habitType,
  cacheScope,
  includeStats = false,
}: UseTrackedHabitOptions) {
  const queryClient = useQueryClient();

  const habitsQuery = useQuery({
    queryKey: queryKeys.habits.all,
    queryFn: getHabits,
  });

  const habit = habitsQuery.data?.find((item) => item.type === habitType) ?? null;
  const habitId = habit?.id;

  const logsQuery = useQuery({
    queryKey: habitId ? queryKeys.habits.logs(habitId) : ["habits", "logs", cacheScope],
    queryFn: () => getLogs(habitId!),
    enabled: Boolean(habitId),
  });

  const statsQuery = useQuery({
    queryKey: habitId ? queryKeys.habits.stats(habitId) : ["habits", "stats", cacheScope],
    queryFn: () => getStats(habitId!),
    enabled: includeStats && Boolean(habitId),
  });

  const createLogMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createLog(habitId!, body),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.habits.logs(habitId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ];

      if (includeStats) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.habits.stats(habitId!) })
        );
      }

      await Promise.all(invalidations);
    },
  });

  const isLoading =
    habitsQuery.isLoading ||
    (Boolean(habitId) && (logsQuery.isLoading || (includeStats && statsQuery.isLoading)));
  const hasError =
    habitsQuery.isError || logsQuery.isError || (includeStats && statsQuery.isError);

  return {
    habit,
    habitId,
    logs: logsQuery.data ?? [],
    stats: includeStats ? (statsQuery.data ?? null) : null,
    createLogMutation,
    habitsQuery,
    logsQuery,
    statsQuery,
    isLoading,
    hasError,
  };
}
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { goalsClient, type Goal } from '@/services/goals.client';

/**
 * Load ACTIVE goals for the currently authenticated user.
 *
 * QueryKey includes user id to prevent cross-user cache leak on logout/login
 * without full reload (Copilot round 1). When userId is unavailable the query
 * is disabled and returns `data: undefined`, which consumers default to [].
 */
export function useActiveGoals() {
  const userQuery = useQuery({
    queryKey: ['authenticated-user'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60_000,
  });

  const userId = userQuery.data?.id;

  return useQuery<Goal[]>({
    queryKey: ['active-goals', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      return goalsClient.loadGoals(userId);
    },
    staleTime: 60_000,
  });
}

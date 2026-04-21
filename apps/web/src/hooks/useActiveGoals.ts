import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { goalsClient, type Goal } from '@/services/goals.client';

export function useActiveGoals() {
  return useQuery<Goal[]>({
    queryKey: ['active-goals'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return goalsClient.loadGoals(user.id);
    },
    staleTime: 60_000,
  });
}

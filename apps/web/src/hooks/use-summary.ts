'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Summary } from '@/lib/types';

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get<Summary>('/summary'),
  });
}

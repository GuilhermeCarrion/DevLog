'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AgendaItem, AgendaItemType, AgendaMonth } from '@/lib/types';

export interface AgendaItemInput {
  title: string;
  description?: string;
  date: string; // ISO
  type?: AgendaItemType;
  projectId?: string | null;
}

// month no formato "YYYY-MM"
export function useAgendaMonth(month: string) {
  return useQuery({
    queryKey: ['agenda', month],
    queryFn: () => api.get<AgendaMonth>(`/agenda?month=${month}`),
  });
}

export function useCreateAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AgendaItemInput) =>
      api.post<AgendaItem>('/agenda', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: Partial<AgendaItemInput> & { id: string; done?: boolean }) =>
      api.patch<AgendaItem>(`/agenda/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/agenda/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

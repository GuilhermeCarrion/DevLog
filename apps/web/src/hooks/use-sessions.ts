'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WorkSession } from '@/lib/types';

// Toda mutação de sessão invalida o prefixo ['sessions'] — cobre lista,
// planejadas e ativa de uma vez (fuzzy matching do React Query por prefixo)
function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['agenda'] });
  };
}

export function useSessions(projectId?: string) {
  return useQuery({
    queryKey: ['sessions', 'list', projectId ?? 'all'],
    queryFn: () =>
      api.get<WorkSession[]>(
        `/sessions${projectId ? `?projectId=${projectId}` : ''}`,
      ),
  });
}

export function usePlannedSessions() {
  return useQuery({
    queryKey: ['sessions', 'planned'],
    queryFn: () => api.get<WorkSession[]>('/sessions/planned'),
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () => api.get<WorkSession | null>('/sessions/active'),
    refetchInterval: 60_000, // mantém o badge do timer em sincronia entre abas
  });
}

export function useQuickStart() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (data: { projectId: string }) =>
      api.post<WorkSession>('/sessions/quick-start', data),
    onSuccess: invalidate,
  });
}

export function useStartPlanned() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkSession>(`/sessions/${id}/start`),
    onSuccess: invalidate,
  });
}

export function useCreatePlanned() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      plannedFor: string;
      notes?: string;
      taskIds?: string[];
    }) => api.post<WorkSession>('/sessions/planned', data),
    onSuccess: invalidate,
  });
}

export function useCapture() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      notes?: string;
      commits?: string;
    }) => api.post<WorkSession>(`/sessions/${id}/capture`, data),
    onSuccess: invalidate,
  });
}

export function useFinishSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      notes?: string;
      commits?: string;
      nextStep?: string;
      taskIds?: string[];
    }) => api.post<WorkSession>(`/sessions/${id}/finish`, data),
    onSuccess: invalidate,
  });
}

export function useUpdateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      plannedFor?: string;
      notes?: string;
      commits?: string;
      nextStep?: string;
      taskIds?: string[];
    }) => api.patch<WorkSession>(`/sessions/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: invalidate,
  });
}

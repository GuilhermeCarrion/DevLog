'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Group, Task, TaskPriority, TaskStatus } from '@/lib/types';

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  notes?: string;
  groupId?: string | null;
}

export function useTasks(
  projectId: string,
  filters?: { status?: TaskStatus | ''; groupId?: string },
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.groupId) params.set('groupId', filters.groupId);
  const qs = params.toString();

  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () =>
      api.get<Task[]>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useGroups(projectId: string) {
  return useQuery({
    queryKey: ['groups', projectId],
    queryFn: () => api.get<Group[]>(`/projects/${projectId}/groups`),
  });
}

// Mudança em grupo reflete na lista de grupos e nas tasks (que mostram a cor)
function useInvalidateGroups(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['groups', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };
}

export function useCreateGroup(projectId: string) {
  const invalidate = useInvalidateGroups(projectId);
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post<Group>(`/projects/${projectId}/groups`, data),
    onSuccess: invalidate,
  });
}

export function useUpdateGroup(projectId: string) {
  const invalidate = useInvalidateGroups(projectId);
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch<Group>(`/groups/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteGroup(projectId: string) {
  const invalidate = useInvalidateGroups(projectId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: invalidate,
  });
}

// Invalida a lista de tasks do projeto + os contadores (['projects'])
function useInvalidateTasks(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };
}

export function useCreateTask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: (data: TaskInput) =>
      api.post<Task>(`/projects/${projectId}/tasks`, data),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: ({ id, ...data }: TaskInput & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteTask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: invalidate,
  });
}

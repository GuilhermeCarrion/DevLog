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

export function useCreateGroup(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post<Group>(`/projects/${projectId}/groups`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['groups', projectId] }),
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskInput) =>
      api.post<Task>(`/projects/${projectId}/tasks`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TaskInput & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';

export interface ProjectInput {
  name?: string;
  description?: string;
  archived?: boolean;
  tagIds?: string[];
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectInput) => api.post<Project>('/projects', data),
    // Invalida a lista → React Query refaz o GET e a UI atualiza sozinha
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ProjectInput & { id: string }) =>
      api.patch<Project>(`/projects/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

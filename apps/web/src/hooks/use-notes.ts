'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';

export interface NoteInput {
  title: string;
  content: string;
  projectId?: string | null;
}

export function useNotes(projectId?: string) {
  return useQuery({
    queryKey: ['notes', projectId ?? 'all'],
    queryFn: () =>
      api.get<Note[]>(`/notes${projectId ? `?projectId=${projectId}` : ''}`),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NoteInput) => api.post<Note>('/notes', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<NoteInput> & { id: string }) =>
      api.patch<Note>(`/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

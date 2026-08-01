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

// Invalida as notas + os contadores do projeto (['projects'])
function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (data: NoteInput) => api.post<Note>('/notes', data),
    onSuccess: invalidate,
  });
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<NoteInput> & { id: string }) =>
      api.patch<Note>(`/notes/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: invalidate,
  });
}

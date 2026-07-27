'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/auth/me'),
    retry: false,
  });
}

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<User>('/auth/login', data),
    onSuccess: () => router.push('/'),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post<User>('/auth/register', data),
    onSuccess: () => router.push('/'),
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear(); // limpa cache — dados do usuário não vazam pra próxima sessão
      router.push('/login');
    },
  });
}

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<User>('/auth/login', data),
    // Popula o cache do ['me'] com o usuário retornado: sem isso, o AuthGate
    // leria o 401 cacheado da tela de login e redirecionaria de volta.
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      router.push('/');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post<User>('/auth/register', data),
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      router.push('/');
    },
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

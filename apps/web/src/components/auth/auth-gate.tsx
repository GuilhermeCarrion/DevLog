'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/hooks/use-auth';

// Proteção de rota client-side.
//
// Por que não middleware: web (Vercel) e api (Railway) ficam em domínios
// diferentes, então o cookie de sessão pertence ao domínio da api e o
// middleware do Next (que roda no domínio da web) nunca o enxergaria. A fonte
// de verdade da sessão é a própria api, via GET /auth/me:
//   - mode="protected": sem sessão (401) → manda pro /login
//   - mode="guest": já logado → manda pro /
export function AuthGate({
  mode,
  children,
}: {
  mode: 'protected' | 'guest';
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (mode === 'protected' && isError) router.replace('/login');
    if (mode === 'guest' && user) router.replace('/');
  }, [mode, isLoading, isError, user, router]);

  // Enquanto resolve a sessão, evita piscar a tela protegida/pública
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando…</span>
      </div>
    );
  }
  if (mode === 'protected' && isError) return null; // redirecionando p/ login
  if (mode === 'guest' && user) return null; // redirecionando p/ home

  return <>{children}</>;
}

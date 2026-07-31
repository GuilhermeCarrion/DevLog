'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { Sidebar } from '@/components/layout/sidebar';
import { ActiveSessionBadge } from '@/components/sessions/active-session-badge';
import { NewSessionButton } from '@/components/sessions/new-session-button';

// Layout autenticado: sidebar fixa + topbar com o fluxo global de sessão.
// O botão "Nova Sessão" e o badge do timer vivem aqui — visíveis em toda tela.
// AuthGate protege tudo: sem sessão válida, redireciona para /login.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-border bg-background/80 px-6 backdrop-blur">
            <ActiveSessionBadge />
            <NewSessionButton />
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}

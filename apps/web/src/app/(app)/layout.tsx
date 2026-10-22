'use client';

import { usePathname } from 'next/navigation';
import { AuthGate } from '@/components/auth/auth-gate';
import { Sidebar } from '@/components/layout/sidebar';
import { ActiveSessionBadge } from '@/components/sessions/active-session-badge';
import { NewSessionButton } from '@/components/sessions/new-session-button';

// "/projetos/cm8x…/tasks" → "~/projetos/…/tasks" (ids longos viram reticências)
function terminalPath(pathname: string) {
  if (pathname === '/') return '~/projetos';
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .map((p) => (p.length > 16 ? '…' : decodeURIComponent(p)));
  return `~/${parts.join('/')}`;
}

// Layout autenticado: sidebar fixa + topbar com o fluxo global de sessão.
// O botão "Nova Sessão" e o badge do timer vivem aqui — visíveis em toda tela.
// AuthGate protege tudo: sem sessão válida, redireciona para /login.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGate mode="protected">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-6 backdrop-blur">
            <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground" translate="no">
              <span aria-hidden="true" className="size-1.5 bg-primary" />
              {terminalPath(pathname)}
              <span aria-hidden="true" className="h-3.5 w-1.5 animate-pulse bg-muted-foreground/60" />
            </p>
            <div className="flex items-center gap-3">
              <ActiveSessionBadge />
              <NewSessionButton />
            </div>
          </header>
          <main id="conteudo" className="dot-grid flex-1">
            <div className="mx-auto w-full max-w-6xl p-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}

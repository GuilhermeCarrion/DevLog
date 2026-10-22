'use client';

import {
  Calculator,
  CalendarDays,
  FileText,
  FolderKanban,
  LogOut,
  NotebookPen,
  Settings,
  Timer,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DotField } from '@/components/ui/dot-field';
import { useLogout, useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Projetos', icon: FolderKanban },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/sessoes', label: 'Sessões', icon: Timer },
  { href: '/notas', label: 'Notas', icon: NotebookPen },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/carteira', label: 'Carteira', icon: Wallet },
  { href: '/relatorio', label: 'Relatório', icon: FileText },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// ">_" em pixel art (7×5) — o prompt do terminal como marca
const LOGO_PIXELS = [
  [0, 0], [1, 1], [2, 2], [1, 3], [0, 4],
  [4, 4], [5, 4], [6, 4],
];

export function PixelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 5" aria-hidden="true" className={className} shapeRendering="crispEdges">
      {LOGO_PIXELS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const logout = useLogout();
  const initials = (me?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  return (
    <aside className="sticky top-0 isolate flex h-screen w-60 shrink-0 flex-col self-start overflow-hidden border-r border-border bg-background">
      {/* ASCII vivo ocupando a sidebar toda: forte embaixo → some em cima */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_top,black,rgb(0_0_0/0.5)_40%,transparent_88%)]"
      >
        <DotField mode="ascii" cell={11} coverage={0.58} speed={0.6} color="#8b8b93" />
      </div>

      <Link
        href="/"
        className="flex h-14 items-center gap-2.5 border-b border-border px-5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        <PixelLogo className="h-3.5 w-5 text-primary" />
        <span className="font-semibold tracking-tight" translate="no">
          DevLog
        </span>
      </Link>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        <p className="label-mono px-3 pb-2 pt-1">Navegação</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-primary"
                />
              )}
              <Icon aria-hidden="true" className={cn('size-4', active && 'text-primary')} />
              {label}
              {active && (
                <span aria-hidden="true" className="ml-auto size-1 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border bg-background/75 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/configuracoes"
            className="flex min-w-0 items-center gap-2.5 rounded-sm px-1 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden="true"
              className="frame flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-card font-mono text-[11px] text-primary"
            >
              {initials || '··'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{me?.name ?? '…'}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {me?.email}
              </span>
            </span>
          </Link>
          <button
            onClick={() => logout.mutate()}
            aria-label="Sair"
            title="Sair"
            className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

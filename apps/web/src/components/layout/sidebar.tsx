'use client';

import { CalendarDays, FolderKanban, LogOut, NotebookPen, Timer } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout, useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Projetos', icon: FolderKanban },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/sessoes', label: 'Sessões', icon: Timer },
  { href: '/notas', label: 'Notas', icon: NotebookPen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 select-none">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
          {'>'}
        </span>
        <span className="font-semibold tracking-tight">DevLog</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{me?.name ?? '…'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {me?.email}
            </p>
          </div>
          <button
            onClick={() => logout.mutate()}
            title="Sair"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

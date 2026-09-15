'use client';

import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/types';

// Forma mínima que a lista precisa — Task e os candidatos do relatório se encaixam.
export interface TaskSelectItem {
  id: string;
  title: string;
  status: TaskStatus;
  group?: { name: string; color: string | null } | null;
}

// Lista reutilizável de seleção de tasks (checkboxes) com busca por texto e
// concluídas escondidas por padrão. As tasks já selecionadas continuam visíveis
// mesmo se concluídas (senão não daria para desmarcá-las).
export function TaskSelectList({
  tasks,
  selectedIds,
  onToggle,
  className,
}: {
  tasks: TaskSelectItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [showDone, setShowDone] = useState(false);

  const doneCount = useMemo(
    () => tasks.filter((t) => t.status === 'CONCLUIDO').length,
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const isDone = t.status === 'CONCLUIDO';
      // esconde concluídas, exceto quando o toggle está ligado ou já selecionada
      if (isDone && !showDone && !selectedIds.includes(t.id)) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, showDone, selectedIds]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar task…"
            className="h-8 pl-8"
          />
        </div>
        {doneCount > 0 && (
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className={cn(
              'shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors cursor-pointer',
              showDone
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
            title="Mostrar/ocultar tasks concluídas"
          >
            Concluídas
          </button>
        )}
      </div>

      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-1.5">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {tasks.length === 0
              ? 'Nenhuma task neste projeto.'
              : 'Nenhuma task encontrada.'}
          </p>
        ) : (
          filtered.map((t) => {
            const selected = selectedIds.includes(t.id);
            const done = t.status === 'CONCLUIDO';
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(t.id)}
                  className="size-4 accent-primary"
                />
                {t.group?.color && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: t.group.color }}
                    title={t.group.name}
                  />
                )}
                <span className={cn('truncate', done && 'text-muted-foreground line-through')}>
                  {t.title}
                </span>
                {done && (
                  <Check className="ml-auto size-3.5 shrink-0 text-primary/70" />
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

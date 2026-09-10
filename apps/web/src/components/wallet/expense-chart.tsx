'use client';

import { formatBRL } from '@/lib/calc';

// Gastos por categoria: barra empilhada proporcional + legenda com %.
export function ExpenseChart({
  data,
}: {
  data: { name: string; color: string; total: number }[];
}) {
  const total = data.reduce((a, c) => a + c.total, 0);

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gastos por categoria
        </p>
        <span className="font-mono text-sm text-muted-foreground">
          {formatBRL(total)}
        </span>
      </div>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
          Sem gastos neste mês.
        </p>
      ) : (
        <>
          {/* barra empilhada */}
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
            {data.map((c) => (
              <div
                key={c.name}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(c.total / total) * 100}%`, background: c.color }}
                title={`${c.name}: ${formatBRL(c.total)}`}
              />
            ))}
          </div>

          {/* legenda */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
            {data.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Math.round((c.total / total) * 100)}%
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-xs">
                  {formatBRL(c.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

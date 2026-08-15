'use client';

import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CATEGORY_META, formatBRL } from '@/lib/calc';
import type { CostItem, CostPeriod } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// Descrição curta de um item arquivado (o snapshot não guarda as horas "auto",
// então itens por hora sem horas informadas aparecem como "auto").
function itemLine(item: CostItem): string {
  if (item.kind === 'HOURLY') {
    return item.hours != null
      ? `${formatBRL(item.amount)}/h × ${item.hours.toFixed(1)}h`
      : `${formatBRL(item.amount)}/h × auto`;
  }
  return CATEGORY_META[item.category].short;
}

// Detalhes de um lançamento: valores registrados (snapshot) + os custos que
// foram arquivados nele. "Reabrir" devolve os custos para a lista ativa.
export function PeriodDetailsDialog({
  period,
  open,
  onOpenChange,
  onReopen,
  reopening,
}: {
  period: CostPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReopen: (period: CostPeriod) => void;
  reopening: boolean;
}) {
  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {period.category && (
              <span
                className="size-2.5 rounded-full"
                style={{ background: period.category.color }}
              />
            )}
            {period.label || period.category?.name || 'Lançamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {/* Cabeçalho: intervalo + categoria */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              {fmtDate(period.startDate)} — {fmtDate(period.endDate)}
            </span>
            {period.category && (
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: `${period.category.color}1f`,
                  color: period.category.color,
                }}
              >
                {period.category.name}
              </span>
            )}
          </div>

          {/* Valores registrados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Horas
              </p>
              <p className="font-mono text-lg">{period.hours.toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-primary/70">
                Valor
              </p>
              <p className="font-mono text-lg text-primary">
                {formatBRL(period.amount)}
              </p>
            </div>
          </div>

          {period.note && (
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground whitespace-pre-wrap">
              {period.note}
            </div>
          )}

          {/* Custos arquivados neste período */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Custos arquivados ({period.items.length})
            </p>
            {period.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                Nenhum custo guardado neste lançamento.
              </p>
            ) : (
              <div className="flex max-h-56 flex-col divide-y divide-border/60 overflow-y-auto">
                {period.items.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  const isDiscount = item.category === 'DESCONTO';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 py-2"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {itemLine(item)}
                        </p>
                      </div>
                      {item.kind === 'FIXED' && (
                        <span
                          className="shrink-0 font-mono text-xs"
                          style={isDiscount ? { color: meta.color } : undefined}
                        >
                          {isDiscount ? '−' : ''}
                          {formatBRL(item.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onReopen(period)}
            disabled={reopening}
            className="mr-auto"
          >
            <RotateCcw className="size-4" />
            Reabrir para editar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

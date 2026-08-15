'use client';

import { Archive, Plus, RotateCcw, Settings2, Trash2, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreatePeriod,
  useDeletePeriod,
  usePeriodCategories,
  usePeriods,
  useReopenPeriod,
} from '@/hooks/use-costs';
import { type DateRange, formatBRL } from '@/lib/calc';
import type { CostPeriod, PeriodCategory, Project } from '@/lib/types';
import { PeriodCategoryDialog } from './period-category-dialog';
import { PeriodDetailsDialog } from './period-details-dialog';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const NO_CATEGORY = '';

// Seção "Períodos de cobrança": filtro de intervalo (dirige as horas de mão de
// obra), botão para ARQUIVAR os custos lançados atuais como um lançamento
// histórico (limpando a lista ativa) e o histórico dos lançamentos.
export function PeriodsSection({
  project,
  range,
  onRangeChange,
  autoHours,
  laborHours,
  suggestedPrice,
  hasCosts,
}: {
  project: Project;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  autoHours: number;
  laborHours: number; // horas informadas de mão de obra (prefill)
  suggestedPrice: number; // preço sugerido atual (prefill do valor)
  hasCosts: boolean; // há custos ativos para arquivar
}) {
  const { data: categories } = usePeriodCategories();
  const { data: periods } = usePeriods(project.id);
  const createPeriod = useCreatePeriod(project.id);
  const reopenPeriod = useReopenPeriod(project.id);
  const deletePeriod = useDeletePeriod(project.id);

  // ---- diálogos auxiliares ----
  const [catDialog, setCatDialog] = useState<{
    open: boolean;
    category: PeriodCategory | null;
  }>({ open: false, category: null });
  const [detailsOf, setDetailsOf] = useState<CostPeriod | null>(null);

  // ---- formulário de salvar (inline) ----
  const [formOpen, setFormOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const hasRange = Boolean(range.from || range.to);

  function openCreate() {
    setCategoryId(categories?.[0]?.id ?? NO_CATEGORY);
    setLabel('');
    setHours(laborHours ? laborHours.toFixed(1) : '');
    setAmount(suggestedPrice ? suggestedPrice.toFixed(2) : '');
    setNote('');
    setFormOpen(true);
  }

  const categoryOptions = useMemo(
    () => [
      { value: NO_CATEGORY, label: 'Sem categoria' },
      ...(categories ?? []).map((c) => ({
        value: c.id,
        label: c.name,
        color: c.color,
      })),
    ],
    [categories],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!range.from || !range.to) {
      toast.error('Defina as datas de início e fim do período.');
      return;
    }
    createPeriod.mutate(
      {
        categoryId: categoryId || null,
        label: label.trim() || null,
        startDate: range.from,
        endDate: range.to,
        hours: Number(hours) || 0,
        amount: Number(amount) || 0,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          toast.success('Período salvo — custos arquivados no histórico.');
        },
        onError: (er: Error) => toast.error(er.message),
      },
    );
  }

  function reopen(p: CostPeriod) {
    if (
      !confirm(
        `Reabrir "${p.label || p.category?.name || 'lançamento'}"? Os ${p.items.length} custo(s) voltam para a lista ativa e este item sai do histórico.`,
      )
    ) {
      return;
    }
    reopenPeriod.mutate(p.id, {
      onSuccess: () => {
        setDetailsOf(null);
        toast.success('Custos devolvidos para a lista ativa.');
      },
      onError: (e) => toast.error(e.message),
    });
  }

  const saving = createPeriod.isPending;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Períodos de cobrança</h3>
          <p className="text-xs text-muted-foreground">
            Arquive os custos lançados como um período (ex: um pagamento) e comece
            do zero.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setCatDialog({ open: true, category: null })}
        >
          <Settings2 className="size-3.5" />
          Nova categoria
        </Button>
      </div>

      {/* ---- Filtro de intervalo ---- */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-secondary/30 p-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            value={range.from ?? ''}
            max={range.to ?? undefined}
            onChange={(e) =>
              onRangeChange({ ...range, from: e.target.value || null })
            }
            className="w-[9.5rem]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input
            type="date"
            value={range.to ?? ''}
            min={range.from ?? undefined}
            onChange={(e) =>
              onRangeChange({ ...range, to: e.target.value || null })
            }
            className="w-[9.5rem]"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm">
            <span className="font-mono font-medium text-primary">
              {autoHours.toFixed(1)}h
            </span>{' '}
            <span className="text-muted-foreground">
              {hasRange ? 'no período' : 'no total'}
            </span>
          </span>
          {hasRange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onRangeChange({ from: null, to: null })}
            >
              <X className="size-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ---- Ação de salvar / formulário inline ---- */}
      {!formOpen ? (
        <div className="flex flex-col gap-1 self-start">
          <Button
            type="button"
            variant="outline"
            onClick={openCreate}
            disabled={!hasCosts}
          >
            <Archive className="size-4" />
            Salvar período (arquivar custos)
          </Button>
          {!hasCosts && (
            <span className="text-[11px] text-muted-foreground">
              Lance custos na lista para poder arquivar um período.
            </span>
          )}
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Salvar período</p>
            <span className="text-xs text-muted-foreground">
              {range.from && range.to
                ? `${fmtDate(range.from)} — ${fmtDate(range.to)}`
                : 'defina o intervalo acima'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  options={categoryOptions}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Nova categoria"
                  onClick={() => setCatDialog({ open: true, category: null })}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rótulo (opcional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Pagamento de agosto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Horas</Label>
              <NumberInput value={hours} onValueChange={setHours} min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <NumberInput value={amount} onValueChange={setAmount} min={0} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="detalhes do lançamento…"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Ao salvar, os custos lançados agora saem da lista e ficam guardados
            neste período.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Salvar período
            </Button>
          </div>
        </form>
      )}

      {/* ---- Histórico ---- */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico
        </p>
        {!periods?.length ? (
          <p className="rounded-lg border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
            Nenhum período salvo ainda.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {periods.map((p) => (
              <div key={p.id} className="group flex items-center gap-2.5 py-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: p.category?.color ?? '#9aa0aa' }}
                />
                <button
                  type="button"
                  onClick={() => setDetailsOf(p)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <p className="truncate text-sm font-medium">
                    {p.label || p.category?.name || 'Lançamento'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {fmtDate(p.startDate)} — {fmtDate(p.endDate)} · {p.hours.toFixed(1)}h ·{' '}
                    {p.items.length} custo(s)
                  </p>
                </button>
                <span className="shrink-0 font-mono text-sm text-primary">
                  {formatBRL(p.amount)}
                </span>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Reabrir para editar (devolve os custos)"
                    onClick={() => reopen(p)}
                    className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Excluir"
                    onClick={() => {
                      if (
                        !confirm(
                          'Excluir este lançamento e os custos guardados nele?',
                        )
                      ) {
                        return;
                      }
                      deletePeriod.mutate(p.id, {
                        onError: (e) => toast.error(e.message),
                      });
                    }}
                    className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PeriodCategoryDialog
        category={catDialog.category}
        open={catDialog.open}
        onOpenChange={(open) => setCatDialog((s) => ({ ...s, open }))}
        onCreated={(cat) => setCategoryId(cat.id)}
      />
      <PeriodDetailsDialog
        period={detailsOf}
        open={detailsOf !== null}
        onOpenChange={(open) => !open && setDetailsOf(null)}
        onReopen={reopen}
        reopening={reopenPeriod.isPending}
      />
    </div>
  );
}

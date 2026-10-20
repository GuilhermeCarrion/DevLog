'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import {
  useCreateInstallment,
  useForecast,
  useWalletCategories,
} from '@/hooks/use-wallet';
import { formatBRL } from '@/lib/calc';
import { cn } from '@/lib/utils';
import { parseAmount, simulateInstallments } from '@/lib/wallet';

const MAX_MONTHS = 24; // limite da projeção na API

function monthShort(month: string) {
  const [y, m] = month.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM/yy', { locale: ptBR });
}

// Simula uma compra parcelada: valor de cada parcela e quanto SOBRA em cada
// mês com ela incluída (projeção = lançado + recorrências). Confirma e cria.
export function InstallmentSimulator({
  month,
  onDone,
}: {
  month: string;
  onDone: () => void;
}) {
  const { data: categories } = useWalletCategories();
  const create = useCreateInstallment();

  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [count, setCount] = useState('');
  const [firstDue, setFirstDue] = useState(`${month}-10`);
  const [categoryId, setCategoryId] = useState('');

  const totalNum = parseAmount(total);
  const countNum = Math.trunc(Number(count));
  const valid = totalNum > 0 && countNum >= 1 && /^\d{4}-\d{2}/.test(firstDue);
  const months = Math.min(countNum || 1, MAX_MONTHS);

  const { data: forecast, isFetching } = useForecast(
    firstDue.slice(0, 7),
    months,
    valid,
  );
  const rows =
    valid && forecast ? simulateInstallments(totalNum, months, forecast) : [];
  const perInstallment = rows[0]?.installment ?? 0;
  const tight = rows.filter((r) => r.after < 0).length;

  function confirm() {
    if (!description.trim()) {
      toast.error('Dê um nome para a compra.');
      return;
    }
    create.mutate(
      {
        description: description.trim(),
        categoryId: categoryId || null,
        totalAmount: totalNum,
        installmentsCount: countNum,
        firstDueDate: firstDue,
      },
      {
        onSuccess: () => {
          toast.success('Parcelamento criado!');
          onDone();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Compra</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Notebook"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Valor total</Label>
          <NumberInput value={total} onValueChange={setTotal} placeholder="R$ 0,00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Parcelas</Label>
          <NumberInput value={count} onValueChange={setCount} placeholder="ex: 12" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">1ª parcela</Label>
          <Input
            type="date"
            value={firstDue}
            onChange={(e) => setFirstDue(e.target.value)}
          />
        </div>
      </div>

      {!valid ? (
        <p className="text-sm text-muted-foreground">
          Preencha valor e nº de parcelas para ver o impacto nos próximos meses.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              <span className="font-mono text-lg font-semibold">
                {countNum}× {formatBRL(perInstallment)}
              </span>{' '}
              {tight > 0 ? (
                <span className="text-rose-300">
                  · aperta {tight} {tight === 1 ? 'mês' : 'meses'}
                </span>
              ) : (
                <span className="text-primary">· cabe em todos os meses</span>
              )}
            </p>
            {isFetching && (
              <span className="text-xs text-muted-foreground">calculando…</span>
            )}
          </div>

          {/* Sobra prevista por mês: antes → com a parcela */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {rows.map((r) => (
              <div
                key={r.month}
                className={cn(
                  'flex flex-col rounded-md border px-2.5 py-1.5',
                  r.after < 0
                    ? 'border-rose-400/40 bg-rose-400/5'
                    : 'border-border bg-secondary/30',
                )}
              >
                <span className="text-[11px] capitalize text-muted-foreground">
                  {monthShort(r.month)}
                </span>
                <span
                  className={cn(
                    'font-mono text-sm',
                    r.after < 0 ? 'text-rose-300' : 'text-foreground',
                  )}
                >
                  {formatBRL(r.after)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  sobra era {formatBRL(r.balance)}
                </span>
              </div>
            ))}
          </div>
          {countNum > MAX_MONTHS && (
            <p className="text-xs text-muted-foreground">
              Mostrando os primeiros {MAX_MONTHS} meses.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              className="w-44"
              options={[
                { value: '', label: 'Sem categoria' },
                ...(categories ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                })),
              ]}
            />
            <Button onClick={confirm} disabled={create.isPending}>
              Criar parcelamento
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

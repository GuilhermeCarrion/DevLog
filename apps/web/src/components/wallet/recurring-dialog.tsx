'use client';

import { Plus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import {
  useCreateRecurring,
  useUpdateRecurring,
  useWalletCategories,
} from '@/hooks/use-wallet';
import type {
  RecurrenceInterval,
  RecurringRule,
  TxType,
  WalletCategory,
} from '@/lib/types';
import { WalletCategoryDialog } from './wallet-category-dialog';

// Cria uma regra recorrente (assinatura, aluguel…). As ocorrências são
// materializadas por mês conforme você navega na carteira.
export function RecurringDialog({
  rule,
  open,
  onOpenChange,
}: {
  rule?: RecurringRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories } = useWalletCategories();
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const editing = !!rule;

  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<TxType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [interval, setInterval] = useState<RecurrenceInterval>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(rule?.type ?? 'EXPENSE');
    setAmount(rule ? String(rule.amount) : '');
    setDescription(rule?.description ?? '');
    setCategoryId(rule?.categoryId ?? '');
    setInterval(rule?.interval ?? 'MONTHLY');
    setDayOfMonth(rule?.dayOfMonth != null ? String(rule.dayOfMonth) : '');
    setStartDate(rule ? rule.startDate.slice(0, 10) : today);
    setEndDate(rule?.endDate ? rule.endDate.slice(0, 10) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Informe uma descrição.');
      return;
    }
    const opts = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(editing ? 'Recorrência atualizada!' : 'Recorrência criada!');
      },
      onError: (er: Error) => toast.error(er.message),
    };
    if (editing) {
      // tipo/frequência/início são fixos; atualiza o resto (propaga aos pendentes)
      update.mutate(
        {
          id: rule!.id,
          amount: Number(amount) || 0,
          description: description.trim(),
          categoryId: categoryId || null,
          dayOfMonth: interval === 'MONTHLY' && dayOfMonth ? Number(dayOfMonth) : undefined,
          endDate: endDate || null,
        },
        opts,
      );
    } else {
      create.mutate(
        {
          type,
          amount: Number(amount) || 0,
          description: description.trim(),
          categoryId: categoryId || null,
          interval,
          dayOfMonth: interval === 'MONTHLY' && dayOfMonth ? Number(dayOfMonth) : undefined,
          startDate,
          endDate: endDate || null,
        },
        opts,
      );
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar recorrência' : 'Nova recorrência'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'A alteração vale para os lançamentos ainda pendentes; os pagos ficam como histórico.'
              : 'Ex: assinatura, aluguel. Aparece automaticamente em cada mês.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TxType)}
                disabled={editing}
                options={[
                  { value: 'EXPENSE', label: 'Saída' },
                  { value: 'INCOME', label: 'Entrada' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <NumberInput value={amount} onValueChange={setAmount} min={0} placeholder="0,00" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Netflix, Aluguel…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  className="flex-1"
                  options={[
                    { value: '', label: 'Sem categoria' },
                    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name, color: c.color })),
                  ]}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Nova categoria"
                  onClick={() => setCatOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frequência</Label>
              <Select
                value={interval}
                onValueChange={(v) => setInterval(v as RecurrenceInterval)}
                disabled={editing}
                options={[
                  { value: 'MONTHLY', label: 'Mensal' },
                  { value: 'WEEKLY', label: 'Semanal' },
                  { value: 'YEARLY', label: 'Anual' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {interval === 'MONTHLY' && (
              <div className="flex flex-col gap-1.5">
                <Label>Dia do mês</Label>
                <NumberInput value={dayOfMonth} onValueChange={setDayOfMonth} min={1} max={31} placeholder="ex: 5" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Início</Label>
              <Input type="date" value={startDate} disabled={editing} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Fim <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? 'Salvar' : 'Criar recorrência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <WalletCategoryDialog
      category={null}
      open={catOpen}
      onOpenChange={setCatOpen}
      onCreated={(c: WalletCategory) => setCategoryId(c.id)}
    />
    </>
  );
}

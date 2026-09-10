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
  useCreateInstallment,
  useUpdateInstallment,
  useWalletCategories,
} from '@/hooks/use-wallet';
import { formatBRL } from '@/lib/calc';
import type { InstallmentPlan, WalletCategory } from '@/lib/types';
import { WalletCategoryDialog } from './wallet-category-dialog';

// Cria uma compra parcelada — gera N transações mensais na hora.
export function InstallmentDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan?: InstallmentPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories } = useWalletCategories();
  const create = useCreateInstallment();
  const update = useUpdateInstallment();
  const editing = !!plan;

  const today = new Date().toISOString().slice(0, 10);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [total, setTotal] = useState('');
  const [count, setCount] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(today);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription(plan?.description ?? '');
    setCategoryId(plan?.categoryId ?? '');
    setTotal(plan ? String(plan.totalAmount) : '');
    setCount(plan ? String(plan.installmentsCount) : '');
    setFirstDueDate(plan ? plan.firstDueDate.slice(0, 10) : today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  const totalNum = Number(total) || 0;
  const countNum = Number(count) || 0;
  const perInstallment = countNum > 0 ? Math.round((totalNum / countNum) * 100) / 100 : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Informe uma descrição.');
      return;
    }
    if (editing) {
      // total/nº de parcelas/data são fixos — edita descrição e categoria
      update.mutate(
        {
          id: plan!.id,
          description: description.trim(),
          categoryId: categoryId || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            toast.success('Parcelamento atualizado!');
          },
          onError: (er) => toast.error(er.message),
        },
      );
      return;
    }
    if (countNum < 1) {
      toast.error('Informe o número de parcelas.');
      return;
    }
    create.mutate(
      {
        description: description.trim(),
        categoryId: categoryId || null,
        totalAmount: totalNum,
        installmentsCount: countNum,
        firstDueDate,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Parcelamento criado!');
        },
        onError: (er) => toast.error(er.message),
      },
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar parcelamento' : 'Nova compra parcelada'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Valor e nº de parcelas são fixos. Descrição e categoria valem para as parcelas ainda pendentes.'
              : 'As parcelas são criadas como saídas mensais, a partir da 1ª data.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Notebook, Geladeira…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Valor total (R$)</Label>
              <NumberInput value={total} onValueChange={setTotal} min={0} placeholder="0,00" disabled={editing} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nº de parcelas</Label>
              <NumberInput value={count} onValueChange={setCount} min={1} placeholder="ex: 12" disabled={editing} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>1ª parcela em</Label>
              <Input type="date" value={firstDueDate} disabled={editing} onChange={(e) => setFirstDueDate(e.target.value)} />
            </div>
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
          </div>

          {countNum > 0 && totalNum > 0 && (
            <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {countNum}× de{' '}
              <span className="font-mono font-medium text-foreground">
                {formatBRL(perInstallment)}
              </span>{' '}
              (última ajustada nos centavos)
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? 'Salvar' : 'Criar parcelamento'}
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

'use client';

import { Plus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useWalletCategories,
} from '@/hooks/use-wallet';
import type { TxType, WalletCategory, WalletTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { WalletCategoryDialog } from './wallet-category-dialog';

// Criar/editar um lançamento (entrada ou saída).
export function TransactionDialog({
  transaction,
  defaultDate,
  open,
  onOpenChange,
}: {
  transaction: WalletTransaction | null;
  defaultDate: string; // yyyy-mm-dd sugerido ao criar
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories } = useWalletCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  const [type, setType] = useState<TxType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paid, setPaid] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDate(transaction.date.slice(0, 10));
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId ?? '');
      setPaid(transaction.paid);
    } else {
      setType('EXPENSE');
      setAmount('');
      setDate(defaultDate);
      setDescription('');
      setCategoryId('');
      setPaid(false);
    }
  }, [open, transaction, defaultDate]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Informe uma descrição.');
      return;
    }
    if (!date) {
      toast.error('Informe a data.');
      return;
    }
    const data = {
      type,
      amount: Number(amount) || 0,
      date,
      description: description.trim(),
      categoryId: categoryId || null,
      paid,
    };
    const opts = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(transaction ? 'Lançamento atualizado!' : 'Lançamento criado!');
      },
      onError: (er: Error) => toast.error(er.message),
    };
    if (transaction) update.mutate({ id: transaction.id, ...data }, opts);
    else create.mutate(data, opts);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transaction ? 'Editar lançamento' : 'Novo lançamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Tipo: entrada / saída */}
            <div className="grid grid-cols-2 gap-2">
              <TypeButton
                active={type === 'INCOME'}
                color="#a3e635"
                label="Entrada"
                onClick={() => setType('INCOME')}
              />
              <TypeButton
                active={type === 'EXPENSE'}
                color="#f472b6"
                label="Saída"
                onClick={() => setType('EXPENSE')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Valor (R$)</Label>
                <NumberInput value={amount} onValueChange={setAmount} min={0} placeholder="0,00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Mercado, Salário, Uber…"
              />
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
                    ...(categories ?? []).map((c) => ({
                      value: c.id,
                      label: c.name,
                      color: c.color,
                    })),
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

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="size-4 accent-primary"
              />
              Já {type === 'INCOME' ? 'recebido' : 'pago'}
            </label>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {transaction ? 'Salvar' : 'Adicionar'}
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

function TypeButton({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
        !active && 'border-border text-muted-foreground hover:text-foreground',
      )}
      style={active ? { background: `${color}1f`, borderColor: `${color}99`, color } : undefined}
    >
      {label}
    </button>
  );
}

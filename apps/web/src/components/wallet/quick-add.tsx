'use client';

import { format } from 'date-fns';
import { Minus, Plus } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { useCreateTransaction, useWalletCategories } from '@/hooks/use-wallet';
import type { TxType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { parseAmount } from '@/lib/wallet';

const today = () => format(new Date(), 'yyyy-MM-dd');

// Barra de lançamento rápido: Enter salva e já limpa para o próximo.
// Data padrão: hoje se o mês exibido é o atual, senão dia 1º do mês exibido.
// (o pai passa key={month} para resetar ao trocar de mês)
export function QuickAdd({ month }: { month: string }) {
  const { data: categories } = useWalletCategories();
  const create = useCreateTransaction();
  const descRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TxType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() =>
    today().startsWith(month) ? today() : `${month}-01`,
  );
  const [categoryId, setCategoryId] = useState('');

  const income = type === 'INCOME';

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!description.trim()) {
      descRef.current?.focus();
      return;
    }
    if (!(value > 0)) {
      toast.error('Informe um valor válido.');
      return;
    }
    create.mutate(
      {
        type,
        amount: value,
        date,
        description: description.trim(),
        categoryId: categoryId || null,
        // até hoje = já aconteceu (pago); data futura = fica a pagar
        paid: date <= today(),
      },
      {
        onSuccess: () => {
          setDescription('');
          setAmount('');
          descRef.current?.focus();
        },
        onError: (er) => toast.error(er.message),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setType(income ? 'EXPENSE' : 'INCOME')}
        title={income ? 'Entrada (clique p/ saída)' : 'Saída (clique p/ entrada)'}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer',
          income
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-rose-400/50 bg-rose-400/10 text-rose-300',
        )}
      >
        {income ? <Plus className="size-4" /> : <Minus className="size-4" />}
      </button>
      <Input
        ref={descRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={income ? 'Entrada… ex: Salário' : 'Gasto… ex: Mercado'}
        className="min-w-40 flex-1"
      />
      <NumberInput
        value={amount}
        onValueChange={setAmount}
        placeholder="R$ 0,00"
        className="w-28"
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-36"
      />
      <Select
        value={categoryId}
        onValueChange={setCategoryId}
        className="w-40"
        options={[
          { value: '', label: 'Sem categoria' },
          ...(categories ?? []).map((c) => ({
            value: c.id,
            label: c.name,
            color: c.color,
          })),
        ]}
      />
      <Button type="submit" disabled={create.isPending}>
        Lançar
      </Button>
    </form>
  );
}

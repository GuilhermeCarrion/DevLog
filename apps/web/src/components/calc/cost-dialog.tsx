'use client';

import { useEffect, useState } from 'react';
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
import { CATEGORY_META, CATEGORY_ORDER, KIND_LABEL } from '@/lib/calc';
import type { CostCategory, CostKind } from '@/lib/types';
import type { CostInput } from '@/hooks/use-costs';

export interface CostDraft {
  name: string;
  category: CostCategory;
  kind: CostKind;
  amount: number;
  hours: number | null;
}

// Form único para criar/editar um custo (item de projeto ou template).
export function CostDialog({
  title,
  cost,
  open,
  onOpenChange,
  onSave,
  onDelete,
  saving,
}: {
  title: string;
  cost: CostDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CostInput) => void;
  onDelete?: () => void;
  saving?: boolean;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CostCategory>('CUSTO');
  const [kind, setKind] = useState<CostKind>('FIXED');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');

  useEffect(() => {
    if (open) {
      setName(cost?.name ?? '');
      setCategory(cost?.category ?? 'CUSTO');
      setKind(cost?.kind ?? 'FIXED');
      setAmount(cost ? String(cost.amount) : '');
      setHours(cost?.hours != null ? String(cost.hours) : '');
    }
  }, [open, cost]);

  // DEV normalmente é por hora; ao trocar categoria, sugere o tipo coerente
  function handleCategory(value: string) {
    const c = value as CostCategory;
    setCategory(c);
    if (c === 'DEV') setKind('HOURLY');
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      kind,
      amount: Number(amount) || 0,
      hours: kind === 'HOURLY' && hours !== '' ? Number(hours) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Nome / descrição</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: VPS Hostinger, Claude Plus, Manutenção…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={handleCategory}
                options={CATEGORY_ORDER.map((c) => ({
                  value: c,
                  label: CATEGORY_META[c].label,
                  color: CATEGORY_META[c].color,
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as CostKind)}
                options={[
                  { value: 'FIXED', label: KIND_LABEL.FIXED },
                  { value: 'HOURLY', label: KIND_LABEL.HOURLY },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{kind === 'HOURLY' ? 'Valor / hora (R$)' : 'Valor (R$)'}</Label>
              <NumberInput
                value={amount}
                onValueChange={setAmount}
                step={1}
                min={0}
                placeholder="0,00"
              />
            </div>
            {kind === 'HOURLY' && (
              <div className="flex flex-col gap-1.5">
                <Label>Horas</Label>
                <NumberInput
                  value={hours}
                  onValueChange={setHours}
                  step={0.5}
                  min={0}
                  placeholder="auto (sessões)"
                />
              </div>
            )}
          </div>

          {kind === 'HOURLY' && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Horas em branco = usa a soma das sessões do projeto
              automaticamente.
            </p>
          )}

          <DialogFooter className="justify-between">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="mr-auto"
              >
                Excluir
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ColorPicker, TAG_COLORS } from '@/components/ui/color-picker';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateSavingsBox,
  useDeleteSavingsBox,
  useUpdateSavingsBox,
} from '@/hooks/use-wallet';
import type { SavingsBox } from '@/lib/types';

// Criar/editar uma caixinha (reserva) — nome e cor. Excluir apaga o histórico.
export function SavingsBoxDialog({
  box,
  open,
  onOpenChange,
  onCreated,
}: {
  box: SavingsBox | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (b: SavingsBox) => void;
}) {
  const create = useCreateSavingsBox();
  const update = useUpdateSavingsBox();
  const del = useDeleteSavingsBox();
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(box?.name ?? '');
      setColor(box?.color ?? TAG_COLORS[0]);
    }
  }, [open, box]);

  function submit() {
    if (!name.trim()) {
      toast.error('Informe um nome.');
      return;
    }
    const data = { name: name.trim(), color };
    const opts = {
      onSuccess: (b: SavingsBox) => {
        onOpenChange(false);
        toast.success(box ? 'Caixinha atualizada!' : 'Caixinha criada!');
        if (!box) onCreated?.(b);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (box) update.mutate({ id: box.id, ...data }, opts);
    else create.mutate(data, opts);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{box ? 'Editar caixinha' : 'Nova caixinha'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Nome</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Reserva de emergência, Viagem…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter className="justify-between">
            {box && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={del.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir caixinha',
                    description: `Excluir a caixinha "${box.name}" e todo o seu histórico de lançamentos?`,
                    confirmLabel: 'Excluir',
                    destructive: true,
                  });
                  if (!ok) return;
                  del.mutate(box.id, {
                    onSuccess: () => {
                      onOpenChange(false);
                      toast.success('Caixinha excluída');
                    },
                    onError: (e) => toast.error(e.message),
                  });
                }}
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
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {box ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

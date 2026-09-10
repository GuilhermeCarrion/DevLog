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
  useCreateWalletCategory,
  useDeleteWalletCategory,
  useUpdateWalletCategory,
} from '@/hooks/use-wallet';
import type { WalletCategory } from '@/lib/types';

// Criar/editar categoria da carteira (mesmo padrão das categorias de período).
export function WalletCategoryDialog({
  category,
  open,
  onOpenChange,
  onCreated,
}: {
  category: WalletCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (c: WalletCategory) => void;
}) {
  const create = useCreateWalletCategory();
  const update = useUpdateWalletCategory();
  const del = useDeleteWalletCategory();
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setColor(category?.color ?? TAG_COLORS[0]);
    }
  }, [open, category]);

  function submit() {
    if (!name.trim()) return;
    const data = { name: name.trim(), color };
    const opts = {
      onSuccess: (c: WalletCategory) => {
        onOpenChange(false);
        toast.success(category ? 'Categoria atualizada!' : 'Categoria criada!');
        if (!category) onCreated?.(c);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (category) update.mutate({ id: category.id, ...data }, opts);
    else create.mutate(data, opts);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
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
              placeholder="ex: Alimentação, Assinaturas, Salário…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter className="justify-between">
            {category && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={del.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir categoria',
                    description: `Excluir a categoria "${category.name}"? Os lançamentos ficam sem categoria.`,
                    confirmLabel: 'Excluir',
                    destructive: true,
                  });
                  if (!ok) return;
                  del.mutate(category.id, {
                    onSuccess: () => {
                      onOpenChange(false);
                      toast.success('Categoria excluída');
                    },
                    onError: (e) => toast.error(e.message),
                  });
                }}
              >
                Excluir
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

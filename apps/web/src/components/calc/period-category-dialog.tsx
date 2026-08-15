'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ColorPicker, TAG_COLORS } from '@/components/ui/color-picker';
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
  useCreatePeriodCategory,
  useDeletePeriodCategory,
  useUpdatePeriodCategory,
} from '@/hooks/use-costs';
import type { PeriodCategory } from '@/lib/types';

// Criar/editar categoria de período (category == null → criar), no mesmo espírito
// do dialog de grupo de task: nome + cor (aqui a cor é obrigatória).
export function PeriodCategoryDialog({
  category,
  open,
  onOpenChange,
  onCreated,
}: {
  category: PeriodCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: PeriodCategory) => void;
}) {
  const createCat = useCreatePeriodCategory();
  const updateCat = useUpdatePeriodCategory();
  const deleteCat = useDeletePeriodCategory();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setColor(category?.color ?? TAG_COLORS[0]);
    }
  }, [open, category]);

  function handleSubmit() {
    if (!name.trim()) return;
    const data = { name: name.trim(), color };
    const options = {
      onSuccess: (cat: PeriodCategory) => {
        onOpenChange(false);
        toast.success(category ? 'Categoria atualizada!' : 'Categoria criada!');
        if (!category) onCreated?.(cat);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (category) updateCat.mutate({ id: category.id, ...data }, options);
    else createCat.mutate(data, options);
  }

  function handleDelete() {
    if (!category) return;
    if (
      !confirm(
        `Excluir a categoria "${category.name}"? Os lançamentos ficam sem categoria.`,
      )
    ) {
      return;
    }
    deleteCat.mutate(category.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Categoria excluída');
      },
      onError: (e) => toast.error(e.message),
    });
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
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Pago, Pendente, Adiantamento…"
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
                onClick={handleDelete}
                disabled={deleteCat.isPending}
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
            <Button
              type="submit"
              disabled={createCat.isPending || updateCat.isPending}
            >
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

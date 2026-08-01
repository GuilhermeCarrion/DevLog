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
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks/use-tasks';
import type { Group } from '@/lib/types';

const NO_COLOR = '__none__';

// Criar/editar grupo (group == null → criar) com nome + cor opcional.
export function GroupDialog({
  projectId,
  group,
  open,
  onOpenChange,
}: {
  projectId: string;
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createGroup = useCreateGroup(projectId);
  const updateGroup = useUpdateGroup(projectId);
  const deleteGroup = useDeleteGroup(projectId);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(NO_COLOR);

  useEffect(() => {
    if (open) {
      setName(group?.name ?? '');
      setColor(group?.color ?? NO_COLOR);
    }
  }, [open, group]);

  function handleSubmit() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      color: color === NO_COLOR ? undefined : color,
    };
    const options = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(group ? 'Grupo atualizado!' : 'Grupo criado!');
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (group) updateGroup.mutate({ id: group.id, ...data }, options);
    else createGroup.mutate(data, options);
  }

  function handleDelete() {
    if (!group) return;
    if (!confirm(`Excluir o grupo "${group.name}"? As tasks ficam sem grupo.`)) {
      return;
    }
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Grupo excluído');
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo' : 'Novo grupo'}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">Nome</Label>
            <Input
              id="group-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Backend, Frontend, Estudos…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-3">
              <ColorPicker value={color} onChange={setColor} />
              <button
                type="button"
                onClick={() => setColor(NO_COLOR)}
                className={cnNoColor(color === NO_COLOR)}
                title="Sem cor"
              >
                sem cor
              </button>
            </div>
          </div>

          <DialogFooter className="justify-between">
            {group && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteGroup.isPending}
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
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {group ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function cnNoColor(active: boolean) {
  return `rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
    active
      ? 'border-primary/50 bg-primary/10 text-primary'
      : 'border-border text-muted-foreground hover:text-foreground'
  }`;
}

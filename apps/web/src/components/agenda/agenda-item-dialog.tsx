'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateAgendaItem,
  useUpdateAgendaItem,
} from '@/hooks/use-agenda';
import { useProjects } from '@/hooks/use-projects';
import type { AgendaItem, AgendaItemType } from '@/lib/types';

const TYPE_LABEL: Record<AgendaItemType, string> = {
  PRAZO: 'Prazo',
  ENTREGA: 'Entrega',
  LEMBRETE: 'Lembrete',
  ANOTACAO: 'Anotação',
};

// Criar/editar item da agenda. Projeto é OPCIONAL — sem projeto = item
// pessoal (ex: "estudar NestJS e Node com APIs").
export function AgendaItemDialog({
  item,
  defaultDate,
  open,
  onOpenChange,
}: {
  item: AgendaItem | null;
  defaultDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects } = useProjects();
  const createItem = useCreateAgendaItem();
  const updateItem = useUpdateAgendaItem();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<AgendaItemType>('LEMBRETE');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? '');
      setDescription(item?.description ?? '');
      setDate(
        format(item ? new Date(item.date) : defaultDate, "yyyy-MM-dd'T'HH:mm"),
      );
      setType(item?.type ?? 'LEMBRETE');
      setProjectId(item?.projectId ?? '');
    }
  }, [open, item, defaultDate]);

  function handleSubmit() {
    if (!title.trim() || !date) return;
    const data = {
      title: title.trim(),
      description: description || undefined,
      date: new Date(date).toISOString(),
      type,
      projectId: projectId || null,
    };
    const options = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(item ? 'Item atualizado!' : 'Item criado!');
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (item) updateItem.mutate({ id: item.id, ...data }, options);
    else createItem.mutate(data, options);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? 'Editar item' : 'Novo item na agenda'}
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
            <Label htmlFor="agenda-title">Título</Label>
            <Input
              id="agenda-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: estudar NestJS e Node com APIs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agenda-date">Data</Label>
              <Input
                id="agenda-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agenda-type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AgendaItemType)}
                options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda-project">
              Projeto <span className="text-muted-foreground/60">(opcional)</span>
            </Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              options={[
                { value: '', label: 'Pessoal (sem projeto)' },
                ...(projects ?? [])
                  .filter((p) => !p.archived)
                  .map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda-desc">Descrição</Label>
            <Textarea
              id="agenda-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createItem.isPending || updateItem.isPending}
            >
              {item ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

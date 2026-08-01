'use client';

import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { copyText, taskToText } from '@/lib/task-text';
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
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from '@/hooks/use-tasks';
import type { Group, Task, TaskPriority, TaskStatus } from '@/lib/types';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  FUTURO: 'Feature / Futuro',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

// Modal único para criar e editar task (task == null → criar)
export function TaskDialog({
  projectId,
  groups,
  task,
  open,
  onOpenChange,
}: {
  projectId: string;
  groups: Group[];
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('BACKLOG');
  const [priority, setPriority] = useState<TaskPriority>('MEDIA');
  const [progress, setProgress] = useState(0);
  const [groupId, setGroupId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setStatus(task?.status ?? 'BACKLOG');
      setPriority(task?.priority ?? 'MEDIA');
      setProgress(task?.progress ?? 0);
      setGroupId(task?.groupId ?? '');
      setNotes(task?.notes ?? '');
    }
  }, [open, task]);

  function handleSubmit() {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      description: description || undefined,
      status,
      priority,
      progress,
      notes: notes || undefined,
      groupId: groupId || null,
    };
    const options = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(task ? 'Task atualizada!' : 'Task criada!');
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (task) updateTask.mutate({ id: task.id, ...data }, options);
    else createTask.mutate(data, options);
  }

  function handleDelete() {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Task excluída');
      },
      onError: (e) => toast.error(e.message),
    });
  }

  // Copia a task (com os valores atuais do formulário) como texto legível
  async function handleCopy() {
    if (!task) return;
    const merged = {
      ...task,
      title,
      description: description || null,
      status,
      priority,
      progress,
      notes: notes || null,
      group: groups.find((g) => g.id === groupId) ?? null,
    };
    const ok = await copyText(taskToText(merged));
    if (ok) toast.success('Task copiada como texto!');
    else toast.error('Não consegui copiar');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Editar task' : 'Nova task'}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc">Descrição</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Mantida atualizada, vira a justificativa do relatório"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
                options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
                options={Object.entries(PRIORITY_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-group">Grupo</Label>
              <Select
                value={groupId}
                onValueChange={setGroupId}
                options={[
                  { value: '', label: 'Sem grupo' },
                  ...groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                    color: g.color ?? undefined,
                  })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-progress">
                Progresso: <span className="text-primary">{progress}%</span>
              </Label>
              <input
                id="task-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-9 accent-[#a3e635]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes">Anotações</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas soltas sobre esta task"
            />
          </div>

          <DialogFooter className="justify-between">
            {task ? (
              <div className="mr-auto flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                >
                  Excluir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  title="Copiar como texto para colar no Claude ou compartilhar"
                >
                  <Copy className="size-4" />
                  Copiar
                </Button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || updateTask.isPending}
            >
              {task ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

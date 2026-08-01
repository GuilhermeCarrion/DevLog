'use client';

import { Copy, FolderPlus, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { GroupDialog } from '@/components/tasks/group-dialog';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TaskDialog,
} from '@/components/tasks/task-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useGroups, useTasks } from '@/hooks/use-tasks';
import { copyText, taskToText } from '@/lib/task-text';
import type { Group, Task, TaskPriority, TaskStatus } from '@/lib/types';

const PRIORITY_VARIANT: Record<TaskPriority, 'secondary' | 'warning' | 'destructive'> = {
  BAIXA: 'secondary',
  MEDIA: 'warning',
  ALTA: 'destructive',
};

const STATUS_VARIANT: Record<TaskStatus, 'outline' | 'info' | 'default' | 'secondary'> = {
  BACKLOG: 'outline',
  EM_ANDAMENTO: 'info',
  CONCLUIDO: 'default',
  FUTURO: 'secondary',
};

export function TasksTab({ projectId }: { projectId: string }) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [groupFilter, setGroupFilter] = useState('');
  const { data: tasks, isLoading } = useTasks(projectId, {
    status: statusFilter,
    groupId: groupFilter,
  });
  const { data: groups } = useGroups(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Agrupa por grupo (tasks sem grupo ficam em "Sem grupo", no fim)
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; group: Group | null; tasks: Task[] }
    >();
    for (const task of tasks ?? []) {
      const key = task.group?.id ?? '__none__';
      const name = task.group?.name ?? 'Sem grupo';
      if (!map.has(key)) map.set(key, { name, group: task.group, tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    return [...map.entries()].sort(([a], [b]) =>
      a === '__none__' ? 1 : b === '__none__' ? -1 : 0,
    );
  }, [tasks]);

  function openNewGroup() {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  }

  async function handleCopy(task: Task) {
    const ok = await copyText(taskToText(task));
    if (ok) toast.success('Task copiada como texto!');
    else toast.error('Não consegui copiar');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TaskStatus | '')}
          className="w-44"
          options={[
            { value: '', label: 'Todos os status' },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <Select
          value={groupFilter}
          onValueChange={setGroupFilter}
          className="w-44"
          options={[
            { value: '', label: 'Todos os grupos' },
            ...(groups ?? []).map((g) => ({
              value: g.id,
              label: g.name,
              color: g.color ?? undefined,
            })),
          ]}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={openNewGroup}>
            <FolderPlus className="size-4" />
            Grupo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova task
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && !tasks?.length && (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhuma task{statusFilter || groupFilter ? ' com esses filtros' : ''}.
        </p>
      )}

      {grouped.map(([key, group]) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {group.group?.color && (
              <span
                className="size-2.5 rounded-full"
                style={{ background: group.group.color }}
              />
            )}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.name}
            </h3>
            {group.group && (
              <button
                title="Editar grupo"
                onClick={() => {
                  setEditingGroup(group.group);
                  setGroupDialogOpen(true);
                }}
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground cursor-pointer"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setEditing(task);
                  setDialogOpen(true);
                }}
                className="group/task flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${task.status === 'CONCLUIDO' ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {task.title}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      title="Copiar como texto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(task);
                      }}
                      className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover/task:opacity-100 cursor-pointer"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <Badge variant={STATUS_VARIANT[task.status]}>
                      {STATUS_LABEL[task.status]}
                    </Badge>
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </div>
                </div>
                {task.description && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="w-9 text-right font-mono text-xs text-muted-foreground">
                    {task.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <TaskDialog
        projectId={projectId}
        groups={groups ?? []}
        task={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <GroupDialog
        projectId={projectId}
        group={editingGroup}
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
      />
    </div>
  );
}

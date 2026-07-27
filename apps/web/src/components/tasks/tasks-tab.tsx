'use client';

import { FolderPlus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TaskDialog,
} from '@/components/tasks/task-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCreateGroup, useGroups, useTasks } from '@/hooks/use-tasks';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

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
  const createGroup = useCreateGroup(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Agrupa por grupo (tasks sem grupo ficam em "Sem grupo", no fim)
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; tasks: Task[] }>();
    for (const task of tasks ?? []) {
      const key = task.group?.id ?? '__none__';
      const name = task.group?.name ?? 'Sem grupo';
      if (!map.has(key)) map.set(key, { name, tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    return [...map.entries()].sort(([a], [b]) =>
      a === '__none__' ? 1 : b === '__none__' ? -1 : 0,
    );
  }, [tasks]);

  function handleNewGroup() {
    const name = prompt('Nome do grupo:');
    if (!name?.trim()) return;
    createGroup.mutate(
      { name: name.trim() },
      { onError: (e) => toast.error(e.message) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
          className="w-44"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="w-44"
        >
          <option value="">Todos os grupos</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleNewGroup}>
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.name}
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  setEditing(task);
                  setDialogOpen(true);
                }}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${task.status === 'CONCLUIDO' ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {task.title}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
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
              </button>
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
    </div>
  );
}

'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FolderPlus,
  Pencil,
  Pin,
  Plus,
} from 'lucide-react';
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
import { useGroups, useReorderGroups, useTasks } from '@/hooks/use-tasks';
import { copyText, taskToText } from '@/lib/task-text';
import type { Group, Task, TaskPriority, TaskStatus } from '@/lib/types';

// Tasks de maior prioridade primeiro dentro de cada grupo.
const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  ALTA: 0,
  MEDIA: 1,
  BAIXA: 2,
};

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
  const [showDone, setShowDone] = useState(false);
  const { data: tasks, isLoading } = useTasks(projectId, {
    status: statusFilter,
    groupId: groupFilter,
  });
  const { data: groups } = useGroups(projectId);
  const reorder = useReorderGroups(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Por padrão esconde as concluídas. Se o usuário filtra explicitamente por
  // um status, respeita o filtro (não aplica o esconde).
  const visibleTasks = useMemo(() => {
    if (statusFilter || showDone) return tasks ?? [];
    return (tasks ?? []).filter((t) => t.status !== 'CONCLUIDO');
  }, [tasks, statusFilter, showDone]);

  // Seções na ordem dos grupos (prioridade → ordem manual → nome, vinda da API).
  // Tasks sem grupo ficam por último; dentro de cada grupo, maior prioridade primeiro.
  const sections = useMemo(() => {
    const byGroup = new Map<string, Task[]>();
    const noGroup: Task[] = [];
    for (const task of visibleTasks) {
      if (task.group?.id) {
        if (!byGroup.has(task.group.id)) byGroup.set(task.group.id, []);
        byGroup.get(task.group.id)!.push(task);
      } else {
        noGroup.push(task);
      }
    }
    const sortByPriority = (arr: Task[]) =>
      [...arr].sort(
        (a, b) => TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority],
      );

    const result: {
      key: string;
      name: string;
      group: Group | null;
      tasks: Task[];
    }[] = [];
    for (const g of groups ?? []) {
      const ts = byGroup.get(g.id);
      if (ts?.length) {
        result.push({ key: g.id, name: g.name, group: g, tasks: sortByPriority(ts) });
      }
    }
    if (noGroup.length) {
      result.push({
        key: '__none__',
        name: 'Sem grupo',
        group: null,
        tasks: sortByPriority(noGroup),
      });
    }
    return result;
  }, [visibleTasks, groups]);

  // Troca dois grupos de posição e persiste a ordem completa.
  function swapGroups(idA: string, idB: string) {
    if (!groups) return;
    const ids = groups.map((g) => g.id);
    const a = ids.indexOf(idA);
    const b = ids.indexOf(idB);
    if (a < 0 || b < 0) return;
    [ids[a], ids[b]] = [ids[b], ids[a]];
    reorder.mutate(ids, { onError: (e) => toast.error(e.message) });
  }

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
      {/* Barra única de ações — todos os controles na mesma altura (h-9) e identidade */}
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
        {/* Toggle "Concluídas" — vira accent (igual Nova task) quando ativo */}
        <Button
          variant={showDone ? 'default' : 'outline'}
          onClick={() => setShowDone((v) => !v)}
        >
          <CheckCircle2 className="size-4" />
          Concluídas
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={openNewGroup}>
            <FolderPlus className="size-4" />
            Grupo
          </Button>
          <Button
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

      {!isLoading && !visibleTasks.length && (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {tasks?.length && !showDone && !statusFilter
            ? 'Só há tasks concluídas — marque “Mostrar concluídas” para vê-las.'
            : `Nenhuma task${statusFilter || groupFilter ? ' com esses filtros' : ''}.`}
        </p>
      )}

      {sections.map((section, idx) => {
        const g = section.group;
        const prev = sections[idx - 1]?.group;
        const next = sections[idx + 1]?.group;
        const canUp = !!g && !!prev && prev.priority === g.priority;
        const canDown = !!g && !!next && next.priority === g.priority;
        return (
          <div key={section.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {g?.color && (
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: g.color }}
                />
              )}
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.name}
              </h3>
              {g?.priority && (
                <span
                  title="Grupo prioritário"
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary"
                >
                  <Pin className="size-2.5" />
                  Prioridade
                </span>
              )}
              {g && (
                <>
                  <button
                    title="Editar grupo"
                    onClick={() => {
                      setEditingGroup(g);
                      setGroupDialogOpen(true);
                    }}
                    className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground cursor-pointer"
                  >
                    <Pencil className="size-3" />
                  </button>
                  {/* Reordenar grupo manualmente (dentro do mesmo bucket de prioridade) */}
                  <div className="ml-auto flex items-center">
                    <button
                      title="Subir grupo"
                      disabled={!canUp || reorder.isPending}
                      onClick={() => prev && swapGroups(g.id, prev.id)}
                      className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      title="Descer grupo"
                      disabled={!canDown || reorder.isPending}
                      onClick={() => next && swapGroups(g.id, next.id)}
                      className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {section.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setEditing(task);
                  setDialogOpen(true);
                }}
                className="group/task flex cursor-pointer overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary/40"
              >
                {/* Faixa lateral na cor do grupo — identifica o grupo num relance */}
                {task.group?.color && (
                  <span
                    aria-hidden
                    className="w-1 shrink-0"
                    style={{ background: task.group.color }}
                  />
                )}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${task.status === 'CONCLUIDO' ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {task.title}
                    </span>
                    {task.group && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: `${task.group.color ?? '#9aa0aa'}22`,
                          color: task.group.color ?? '#9aa0aa',
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: task.group.color ?? '#9aa0aa' }}
                        />
                        {task.group.name}
                      </span>
                    )}
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
              </div>
              ))}
            </div>
          </div>
        );
      })}

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

'use client';

import { CalendarPlus, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SessionCard } from '@/components/sessions/session-card';
import { TaskSelectList } from '@/components/tasks/task-select-list';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/hooks/use-projects';
import { useCreatePlanned, useSessions } from '@/hooks/use-sessions';
import { useTasks } from '@/hooks/use-tasks';
import { sessionStatus, type WorkSession } from '@/lib/types';

// Tela Sessões: histórico completo + planejamento semanal (criar sessões
// com plannedFor definido e startedAt nulo — alimentam o botão global)
const STATUS_FILTER = [
  { value: '', label: 'Todos os status' },
  { value: 'plano', label: 'Planos / sprints' },
  { value: 'ativa', label: 'Ativa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluídas' },
];

export default function SessoesPage() {
  const { data: sessions, isLoading } = useSessions();
  const { data: projects } = useProjects();
  const [planOpen, setPlanOpen] = useState(false);
  const [fProject, setFProject] = useState('');
  const [fStatus, setFStatus] = useState('');

  const filtered = useMemo(
    () =>
      (sessions ?? []).filter((s) => {
        if (fProject && s.projectId !== fProject) return false;
        if (fStatus && sessionStatus(s) !== fStatus) return false;
        return true;
      }),
    [sessions, fProject, fStatus],
  );

  // Planos/sprints ativos (templates) e sessões trabalhadas (histórico)
  const planned = filtered.filter((s) => sessionStatus(s) === 'plano');
  const worked = filtered.filter((s) => s.startedAt != null);

  // Histórico agrupado por sprint (parentId). '__none__' = avulsas.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string | null; sessions: WorkSession[] }
    >();
    for (const s of worked) {
      const key = s.parentId ?? '__none__';
      if (!map.has(key)) map.set(key, { name: s.parent?.name ?? null, sessions: [] });
      map.get(key)!.sessions.push(s);
    }
    return [...map.entries()];
  }, [worked]);
  const hasSprints = groups.some(([key]) => key !== '__none__');

  // "Filtro escondido": clicar num plano foca só as sessões daquele sprint
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
  const sprintSessions = selectedSprint
    ? (sessions ?? []).filter(
        (s) => s.parentId === selectedSprint && s.startedAt != null,
      )
    : [];
  const selectedSprintName =
    (sessions ?? []).find((s) => s.id === selectedSprint)?.name ?? 'plano';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessões</h1>
          <p className="text-sm text-muted-foreground">
            Planejamento semanal e histórico de trabalho
          </p>
        </div>
        <Button onClick={() => setPlanOpen(true)}>
          <CalendarPlus className="size-4" />
          Planejar sessão
        </Button>
      </div>

      {/* Filtros básicos: projeto + status */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-52">
          <Select
            value={fProject}
            onValueChange={setFProject}
            options={[
              { value: '', label: 'Todos os projetos' },
              ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
        <div className="w-44">
          <Select value={fStatus} onValueChange={setFStatus} options={STATUS_FILTER} />
        </div>
        {(fProject || fStatus) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setFProject('');
              setFStatus('');
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {planned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planos / sprints
          </h2>
          {planned.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              selected={selectedSprint === s.id}
              onSelect={() =>
                setSelectedSprint((cur) => (cur === s.id ? null : s.id))
              }
            />
          ))}
        </section>
      )}

      {selectedSprint ? (
        // Foco num sprint: mostra só as sessões dele
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary/80">
              <Layers className="size-3.5" />
              Sessões de “{selectedSprintName}”
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedSprint(null)}
            >
              Ver histórico completo
            </Button>
          </div>
          {sprintSessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhuma sessão iniciada deste plano ainda.
            </p>
          ) : (
            sprintSessions.map((s) => <SessionCard key={s.id} session={s} />)
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico
          </h2>
          {!isLoading && worked.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {fProject || fStatus
                ? 'Nenhuma sessão com esses filtros.'
                : 'Nenhuma sessão registrada ainda. Clique em “Nova Sessão” no topo para começar.'}
            </p>
          )}
          {groups.map(([key, g]) => (
            <div key={key} className="flex flex-col gap-2">
              {key !== '__none__' ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-primary/80">
                  <Layers className="size-3.5" />
                  {g.name || 'Plano'}
                </p>
              ) : (
                hasSprints && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Avulsas
                  </p>
                )
              )}
              {g.sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          ))}
        </section>
      )}

      <PlanSessionDialog open={planOpen} onOpenChange={setPlanOpen} />
    </div>
  );
}

function PlanSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects } = useProjects();
  const createPlanned = useCreatePlanned();
  const activeProjects = projects?.filter((p) => !p.archived) ?? [];

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [plannedFor, setPlannedFor] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>([]);

  const selectedProject = projectId || activeProjects[0]?.id || '';
  const { data: tasks } = useTasks(selectedProject || 'none');

  function toggleTask(id: string) {
    setTaskIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function handleCreate() {
    if (!selectedProject || !plannedFor) {
      toast.error('Escolha projeto e data');
      return;
    }
    if (dueAt && new Date(dueAt) < new Date(plannedFor)) {
      toast.error('O prazo não pode ser antes do início.');
      return;
    }
    createPlanned.mutate(
      {
        projectId: selectedProject,
        name: name.trim() || undefined,
        plannedFor: new Date(plannedFor).toISOString(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        notes: notes || undefined,
        taskIds: taskIds.length ? taskIds : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setNotes('');
          setPlannedFor('');
          setDueAt('');
          setTaskIds([]);
          toast.success('Plano criado!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo plano / sprint</DialogTitle>
          <DialogDescription>
            Um plano é reutilizável: você pode iniciar várias sessões a partir
            dele (herdando as tasks) e concluí-lo quando não for mais trabalhá-lo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Nome do plano/sprint (opcional)</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Sprint 1, Tela de Login, Correções…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Projeto</Label>
            <Select
              value={selectedProject}
              onValueChange={(v) => {
                setProjectId(v);
                setTaskIds([]);
              }}
              placeholder="Selecione um projeto"
              options={activeProjects.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Início previsto</Label>
            <Input
              type="datetime-local"
              value={plannedFor}
              onChange={(e) => setPlannedFor(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Prazo (fim previsto) — opcional</Label>
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Tasks esperadas</Label>
            <TaskSelectList
              tasks={tasks}
              selectedIds={taskIds}
              onToggle={toggleTask}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>O que pretende fazer</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Plano da sessão — vira a nota inicial quando ela começar"
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createPlanned.isPending}>
            Criar planejamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

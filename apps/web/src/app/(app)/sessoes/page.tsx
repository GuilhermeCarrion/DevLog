'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SessionCard } from '@/components/sessions/session-card';
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
import { sessionStatus } from '@/lib/types';

// Tela Sessões: histórico completo + planejamento semanal (criar sessões
// com plannedFor definido e startedAt nulo — alimentam o botão global)
export default function SessoesPage() {
  const { data: sessions, isLoading } = useSessions();
  const [planOpen, setPlanOpen] = useState(false);

  const planned = sessions?.filter((s) => sessionStatus(s) === 'planejada') ?? [];
  const others = sessions?.filter((s) => sessionStatus(s) !== 'planejada') ?? [];

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

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {planned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planejadas
          </h2>
          {planned.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico
        </h2>
        {!isLoading && !others.length && (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhuma sessão registrada ainda. Clique em “Nova Sessão” no topo
            para começar.
          </p>
        )}
        {others.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </section>

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
  const [plannedFor, setPlannedFor] = useState('');
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
    createPlanned.mutate(
      {
        projectId: selectedProject,
        plannedFor: new Date(plannedFor).toISOString(),
        notes: notes || undefined,
        taskIds: taskIds.length ? taskIds : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNotes('');
          setPlannedFor('');
          setTaskIds([]);
          toast.success('Sessão planejada criada!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planejar sessão</DialogTitle>
          <DialogDescription>
            Crie com antecedência — na hora de trabalhar, é só iniciar pelo
            botão “Nova Sessão → Planejada”.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Projeto</Label>
            <Select
              value={selectedProject}
              onChange={(e) => {
                setProjectId(e.target.value);
                setTaskIds([]);
              }}
            >
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Quando</Label>
            <Input
              type="datetime-local"
              value={plannedFor}
              onChange={(e) => setPlannedFor(e.target.value)}
            />
          </div>
        </div>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Tasks esperadas</Label>
            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
              {tasks.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={taskIds.includes(t.id)}
                    onChange={() => toggleTask(t.id)}
                    className="accent-[#a3e635]"
                  />
                  <span className="truncate">{t.title}</span>
                </label>
              ))}
            </div>
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

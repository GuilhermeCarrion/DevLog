'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TaskSelectList } from '@/components/tasks/task-select-list';
import { useCompletePlan, useFinishSession } from '@/hooks/use-sessions';
import { useTasks } from '@/hooks/use-tasks';
import type { WorkSession } from '@/lib/types';

// Encerramento de sessão: formulário curto, NENHUM campo obrigatório (regra da
// spec — salva em branco se preciso). Tasks trabalhadas são checkboxes.
export function FinishSessionDialog({
  session,
  open,
  onOpenChange,
}: {
  session: WorkSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const finish = useFinishSession();
  const completePlan = useCompletePlan();
  const { data: tasks } = useTasks(session.projectId);
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>([]);
  // Ao encerrar, opcionalmente conclui o plano/sprint de origem (não trabalha mais nele)
  const [concludePlan, setConcludePlan] = useState(false);

  // Pré-preenche com o que a sessão já acumulou (captura rápida / planejamento)
  useEffect(() => {
    if (open) {
      setNotes(session.notes ?? '');
      setCommits(session.commits ?? '');
      setNextStep(session.nextStep ?? '');
      setTaskIds(session.tasks.map((t) => t.id));
      setConcludePlan(false);
    }
  }, [open, session]);

  function toggleTask(id: string) {
    setTaskIds((current) =>
      current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id],
    );
  }

  function handleFinish() {
    finish.mutate(
      {
        id: session.id,
        notes: notes || undefined,
        commits: commits || undefined,
        nextStep: nextStep || undefined,
        taskIds,
      },
      {
        onSuccess: () => {
          // Opcionalmente conclui o plano de origem no mesmo fluxo
          if (concludePlan && session.parentId) {
            completePlan.mutate(session.parentId, {
              onSuccess: () => {
                onOpenChange(false);
                toast.success('Sessão encerrada e plano concluído!');
              },
              onError: (e) => {
                onOpenChange(false);
                toast.error(`Sessão encerrada, mas falhou ao concluir o plano: ${e.message}`);
              },
            });
          } else {
            onOpenChange(false);
            toast.success('Sessão encerrada!');
          }
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar sessão — {session.project.name}</DialogTitle>
          <DialogDescription>
            Nenhum campo é obrigatório. Registre o que fizer sentido.
          </DialogDescription>
        </DialogHeader>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Tasks trabalhadas</Label>
            <TaskSelectList
              tasks={tasks}
              selectedIds={taskIds}
              onToggle={toggleTask}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finish-notes">Notas</Label>
          <Textarea
            id="finish-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="O que foi feito, decisões, problemas…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finish-commits">Commits</Label>
          <Textarea
            id="finish-commits"
            value={commits}
            onChange={(e) => setCommits(e.target.value)}
            rows={2}
            placeholder="hash - descrição (um por linha)"
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finish-next">Próximo passo</Label>
          <Textarea
            id="finish-next"
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            rows={2}
            placeholder="Por onde continuar na próxima sessão"
          />
        </div>

        {session.parent && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            <input
              type="checkbox"
              checked={concludePlan}
              onChange={(e) => setConcludePlan(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Concluir o plano{' '}
              <span className="font-medium">
                {session.parent.name || 'sem nome'}
              </span>{' '}
              <span className="text-muted-foreground">
                — não vou mais trabalhar nele (sai das sessões planejadas).
              </span>
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleFinish}
            disabled={finish.isPending || completePlan.isPending}
          >
            {finish.isPending || completePlan.isPending
              ? 'Encerrando…'
              : 'Encerrar sessão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

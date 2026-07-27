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
import { useFinishSession } from '@/hooks/use-sessions';
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
  const { data: tasks } = useTasks(session.projectId);
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // Pré-preenche com o que a sessão já acumulou (captura rápida / planejamento)
  useEffect(() => {
    if (open) {
      setNotes(session.notes ?? '');
      setCommits(session.commits ?? '');
      setNextStep(session.nextStep ?? '');
      setTaskIds(session.tasks.map((t) => t.id));
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
          onOpenChange(false);
          toast.success('Sessão encerrada!');
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

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleFinish} disabled={finish.isPending}>
            {finish.isPending ? 'Encerrando…' : 'Encerrar sessão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

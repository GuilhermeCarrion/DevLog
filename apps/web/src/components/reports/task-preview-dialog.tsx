'use client';

import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReportCandidateSession, ReportCandidateTask } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  FUTURO: 'Feature ou futuro',
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Preview da task dentro da tela de relatório (não navega): descrição, notas,
// progresso e as sessões dela que caíram no intervalo.
export function TaskPreviewDialog({
  task,
  sessions,
  open,
  onOpenChange,
}: {
  task: ReportCandidateTask | null;
  sessions: ReportCandidateSession[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!task) return null;
  const taskSessions = sessions.filter((s) =>
    s.tasks.some((t) => t.id === task.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.group && (
              <span
                className="size-2.5 rounded-full"
                style={{ background: task.group.color }}
              />
            )}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            {task.group && (
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: `${task.group.color}1f`,
                  color: task.group.color,
                }}
              >
                {task.group.name}
              </span>
            )}
            <span>{STATUS_LABEL[task.status] ?? task.status}</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${task.progress}%` }}
                />
              </span>
              {task.progress}%
            </span>
          </div>

          {task.description && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Descrição
              </p>
              <p className="whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {task.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Notas da task
              </p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {task.notes}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="size-3.5" />
              Sessões no intervalo ({taskSessions.length})
            </p>
            {taskSessions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
                Nenhuma sessão desta task no intervalo.
              </p>
            ) : (
              <div className="flex max-h-64 flex-col divide-y divide-border/60 overflow-y-auto">
                {taskSessions.map((s) => (
                  <div key={s.id} className="py-2">
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(s.startedAt)}
                    </p>
                    {s.notes ? (
                      <p className="mt-0.5 whitespace-pre-wrap">{s.notes}</p>
                    ) : (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">
                        (sem notas)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

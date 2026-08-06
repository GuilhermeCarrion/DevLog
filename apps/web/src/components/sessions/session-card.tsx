'use client';

import { CalendarClock, Pencil, Play, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useDeleteSession,
  useStartPlanned,
  useUpdateSession,
} from '@/hooks/use-sessions';
import { formatDateTime, formatDuration } from '@/lib/format';
import { sessionStatus, type WorkSession } from '@/lib/types';

const STATUS_BADGE = {
  planejada: { label: 'Planejada', variant: 'info' as const },
  ativa: { label: 'Ativa', variant: 'default' as const },
  concluida: { label: 'Concluída', variant: 'secondary' as const },
};

export function SessionCard({ session }: { session: WorkSession }) {
  const status = sessionStatus(session);
  const badge = STATUS_BADGE[status];
  const startPlanned = useStartPlanned();
  const deleteSession = useDeleteSession();
  const updateSession = useUpdateSession();

  const [editOpen, setEditOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [nextStep, setNextStep] = useState('');

  useEffect(() => {
    if (editOpen) {
      setNotes(session.notes ?? '');
      setCommits(session.commits ?? '');
      setNextStep(session.nextStep ?? '');
    }
  }, [editOpen, session]);

  function handleSave() {
    updateSession.mutate(
      {
        id: session.id,
        notes: notes || undefined,
        commits: commits || undefined,
        nextStep: nextStep || undefined,
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          toast.success('Sessão atualizada!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{session.project.name}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <div className="ml-auto flex items-center gap-1">
          {status === 'planejada' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                startPlanned.mutate(session.id, {
                  onSuccess: () => toast.success('Sessão iniciada!'),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              <Play className="size-3.5" />
              Iniciar
            </Button>
          )}
          {status !== 'ativa' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                title="Editar"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Excluir"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm('Excluir esta sessão?')) {
                    deleteSession.mutate(session.id, {
                      onError: (e) => toast.error(e.message),
                    });
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {session.plannedFor && (
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            planejada p/ {formatDateTime(session.plannedFor)}
          </span>
        )}
        {session.startedAt && (
          <span>início {formatDateTime(session.startedAt)}</span>
        )}
        {session.startedAt && session.endedAt && (
          <span className="font-mono text-primary/80">
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
        )}
      </div>

      {session.tasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {session.tasks.map((t) => {
            const color = t.group?.color;
            return (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
                style={
                  color
                    ? { background: `${color}18`, borderColor: `${color}55`, color }
                    : undefined
                }
                // sem cor de grupo → cai no estilo neutro (borda padrão)
              >
                {color && (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: color }}
                  />
                )}
                {t.title}
              </span>
            );
          })}
        </div>
      )}

      {session.notes && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {session.notes}
        </p>
      )}
      {session.commits && (
        <pre className="overflow-x-auto rounded bg-secondary/60 p-2 font-mono text-xs text-muted-foreground">
          {session.commits}
        </pre>
      )}
      {session.nextStep && (
        <p className="text-sm">
          <span className="font-medium text-primary">Próximo passo:</span>{' '}
          <span className="text-muted-foreground">{session.nextStep}</span>
        </p>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sessão — {session.project.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Commits</Label>
            <Textarea
              value={commits}
              onChange={(e) => setCommits(e.target.value)}
              rows={2}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Próximo passo</Label>
            <Textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateSession.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

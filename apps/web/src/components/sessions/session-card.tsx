'use client';

import { CalendarClock, CheckCheck, Layers, Pencil, Play, Trash2 } from 'lucide-react';
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCompletePlan,
  useDeleteSession,
  useStartPlanned,
  useUpdateSession,
} from '@/hooks/use-sessions';
import { formatDateTime, formatSeconds } from '@/lib/format';
import { sessionStatus, type WorkSession } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_BADGE = {
  plano: { label: 'Plano', variant: 'info' as const },
  plano_concluido: { label: 'Plano concluído', variant: 'secondary' as const },
  ativa: { label: 'Ativa', variant: 'default' as const },
  pausada: { label: 'Pausada', variant: 'secondary' as const },
  concluida: { label: 'Concluída', variant: 'secondary' as const },
};

export function SessionCard({
  session,
  selected,
  onSelect,
}: {
  session: WorkSession;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const status = sessionStatus(session);
  const badge = STATUS_BADGE[status];
  const isPlan = status === 'plano' || status === 'plano_concluido';
  const isOpen = status === 'ativa' || status === 'pausada'; // sessão aberta
  const startPlanned = useStartPlanned();
  const completePlan = useCompletePlan();
  const deleteSession = useDeleteSession();
  const updateSession = useUpdateSession();
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [nextStep, setNextStep] = useState('');

  useEffect(() => {
    if (editOpen) {
      setName(session.name ?? '');
      setNotes(session.notes ?? '');
      setCommits(session.commits ?? '');
      setNextStep(session.nextStep ?? '');
    }
  }, [editOpen, session]);

  function handleSave() {
    updateSession.mutate(
      {
        id: session.id,
        name: isPlan ? name || undefined : undefined,
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
    <div
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-colors',
        onSelect && 'cursor-pointer hover:border-primary/40',
        selected ? 'border-primary ring-1 ring-primary/40' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium">
            {isPlan && session.name ? session.name : session.project.name}
          </span>
          {isPlan && session.name && (
            <span className="ml-2 text-xs text-muted-foreground">
              {session.project.name}
            </span>
          )}
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {isPlan && (session._count?.children ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground">
            {session._count?.children} sessão(ões)
          </span>
        )}
        <div
          className="ml-auto flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {status === 'plano' && (
            <>
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
              <Button
                size="sm"
                variant="ghost"
                title="Marcar plano como concluído (sai das planejadas)"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Concluir plano',
                    description: 'Marcar este plano como concluído? Ele sai da lista de planejadas.',
                    confirmLabel: 'Concluir',
                  });
                  if (!ok) return;
                  completePlan.mutate(session.id, {
                    onSuccess: () => toast.success('Plano concluído!'),
                    onError: (e) => toast.error(e.message),
                  });
                }}
              >
                <CheckCheck className="size-3.5" />
                Concluir
              </Button>
            </>
          )}
          {!isOpen && (
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
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir sessão',
                    description: 'Excluir esta sessão?',
                    confirmLabel: 'Excluir',
                    destructive: true,
                  });
                  if (ok) {
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
        {session.parent && (
          <span
            className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"
            title="Sessão de um plano/sprint"
          >
            <Layers className="size-3" />
            parte de: {session.parent.name || 'plano'}
          </span>
        )}
        {session.plannedFor && (
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            {isPlan ? 'plano p/' : 'planejada p/'} {formatDateTime(session.plannedFor)}
          </span>
        )}
        {session.startedAt && (
          <span>início {formatDateTime(session.startedAt)}</span>
        )}
        {session.endedAt && (
          <span className="font-mono text-primary/80">
            {formatSeconds(session.accumulatedSeconds)}
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
            <DialogTitle>
              {isPlan ? 'Editar plano' : 'Editar sessão'} — {session.project.name}
            </DialogTitle>
          </DialogHeader>
          {isPlan && (
            <div className="flex flex-col gap-1.5">
              <Label>Nome do plano/sprint</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Sprint 1, Tela de Login…"
              />
            </div>
          )}
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

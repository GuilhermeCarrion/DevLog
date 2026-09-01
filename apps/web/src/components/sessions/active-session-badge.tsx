'use client';

import { Pause, Play, Square, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FinishSessionDialog } from '@/components/sessions/finish-session-dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  useActiveSession,
  useCapture,
  usePauseSession,
  useResumeSession,
} from '@/hooks/use-sessions';
import { formatSeconds } from '@/lib/format';
import { sessionElapsedSeconds } from '@/lib/types';
import { cn } from '@/lib/utils';

// Badge fixo do timer: aparece em qualquer tela enquanto há sessão ativa.
// Clicar abre a captura rápida (texto vai CONCATENANDO em notes/commits).
export function ActiveSessionBadge() {
  const { data: active } = useActiveSession();
  const capture = useCapture();
  const pause = usePauseSession();
  const resume = useResumeSession();
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [finishOpen, setFinishOpen] = useState(false);

  // O cronômetro só corre enquanto há segmento em andamento (runningSince).
  // Pausada = tempo congelado (não precisa de tick).
  const running = Boolean(active?.runningSince);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!active?.startedAt) return null;

  const elapsed = formatSeconds(sessionElapsedSeconds(active, now));

  function handleCapture() {
    if (!notes.trim() && !commits.trim()) return;
    capture.mutate(
      {
        id: active!.id,
        notes: notes.trim() || undefined,
        commits: commits.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNotes('');
          setCommits('');
          toast.success('Capturado!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                running
                  ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border-border bg-secondary text-muted-foreground hover:bg-accent',
              )}
            >
              <Timer className={cn('size-4', running && 'animate-pulse')} />
              <span className="font-mono">{elapsed}</span>
              {!running && <span className="text-xs">(pausada)</span>}
              <span className="max-w-32 truncate text-xs opacity-80">
                {active.project.name}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <p className="mb-2 text-sm font-medium">Captura rápida</p>
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="O que está acontecendo? (vai para as notas da sessão)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <Textarea
                placeholder="Commits (um por linha: hash - descrição)"
                value={commits}
                onChange={(e) => setCommits(e.target.value)}
                rows={2}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={handleCapture}
                disabled={capture.isPending || (!notes.trim() && !commits.trim())}
              >
                Capturar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {running ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pause.mutate(active.id, { onError: (e) => toast.error(e.message) })}
            disabled={pause.isPending}
            title="Pausar (para o cronômetro, continua a mesma sessão)"
          >
            <Pause className="size-3" />
            Pausar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => resume.mutate(active.id, { onError: (e) => toast.error(e.message) })}
            disabled={resume.isPending}
            title="Retomar a sessão"
          >
            <Play className="size-3" />
            Retomar
          </Button>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setFinishOpen(true)}
        >
          <Square className="size-3" />
          Encerrar
        </Button>
      </div>

      <FinishSessionDialog
        session={active}
        open={finishOpen}
        onOpenChange={setFinishOpen}
      />
    </>
  );
}

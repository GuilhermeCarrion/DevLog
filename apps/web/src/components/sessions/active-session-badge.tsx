'use client';

import { Square, Timer } from 'lucide-react';
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
import { useActiveSession, useCapture } from '@/hooks/use-sessions';
import { formatElapsed } from '@/lib/format';

// Badge fixo do timer: aparece em qualquer tela enquanto há sessão ativa.
// Clicar abre a captura rápida (texto vai CONCATENANDO em notes/commits).
export function ActiveSessionBadge() {
  const { data: active } = useActiveSession();
  const capture = useCapture();
  const [notes, setNotes] = useState('');
  const [commits, setCommits] = useState('');
  const [finishOpen, setFinishOpen] = useState(false);

  // Re-renderiza a cada segundo para o timer andar (client-side puro)
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active?.startedAt) return null;

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
            <button className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer">
              <Timer className="size-4 animate-pulse" />
              <span className="font-mono">{formatElapsed(active.startedAt)}</span>
              <span className="max-w-32 truncate text-xs text-primary/80">
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

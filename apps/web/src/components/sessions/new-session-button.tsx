'use client';

import { Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { useProjects } from '@/hooks/use-projects';
import {
  useActiveSession,
  usePlannedSessions,
  useQuickStart,
  useStartPlanned,
} from '@/hooks/use-sessions';
import { formatDateTime } from '@/lib/format';

// Botão global "Nova Sessão" — 2 cliques para começar a trabalhar:
// A) Início rápido: escolher projeto (pré-preenchido com o último usado) → Iniciar
// B) Planejada: escolher uma sessão criada no planejamento semanal → começa com tudo pronto
export function NewSessionButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'rapida' | 'planejada'>('rapida');
  const { data: projects } = useProjects();
  const { data: planned } = usePlannedSessions();
  const { data: active } = useActiveSession();
  const quickStart = useQuickStart();
  const startPlanned = useStartPlanned();

  const activeProjects = projects?.filter((p) => !p.archived) ?? [];
  // Último projeto usado fica no localStorage — pré-preenche o seletor
  const [projectId, setProjectId] = useState(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('devlog:lastProject') ?? '')
      : '',
  );

  if (active) return null; // já existe sessão ativa — o badge do timer assume

  const selectedProject =
    activeProjects.find((p) => p.id === projectId)?.id ??
    activeProjects[0]?.id ??
    '';

  function handleQuickStart() {
    if (!selectedProject) {
      toast.error('Crie um projeto primeiro');
      return;
    }
    localStorage.setItem('devlog:lastProject', selectedProject);
    quickStart.mutate(
      { projectId: selectedProject },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success('Sessão iniciada — bom trabalho!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleStartPlanned(id: string) {
    startPlanned.mutate(id, {
      onSuccess: () => {
        setOpen(false);
        toast.success('Sessão planejada iniciada!');
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nova Sessão
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
          {(['rapida', 'planejada'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                tab === t
                  ? 'bg-card font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'rapida' ? 'Início rápido' : 'Planejada'}
            </button>
          ))}
        </div>

        {tab === 'rapida' ? (
          <div className="flex flex-col gap-3">
            <Select
              value={selectedProject}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {activeProjects.length === 0 && (
                <option value="">Nenhum projeto</option>
              )}
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Button onClick={handleQuickStart} disabled={quickStart.isPending}>
              <Play className="size-4" />
              Iniciar agora
            </Button>
          </div>
        ) : (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {!planned?.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma sessão planejada.
                <br />
                Crie no Planejamento semanal (tela Sessões).
              </p>
            )}
            {planned?.map((s) => (
              <button
                key={s.id}
                onClick={() => handleStartPlanned(s.id)}
                disabled={startPlanned.isPending}
                className="flex flex-col items-start gap-1 rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.plannedFor ? formatDateTime(s.plannedFor) : ''}
                  </span>
                </div>
                {s.tasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {s.tasks.map((t) => t.title).join(' · ')}
                  </span>
                )}
                {s.notes && (
                  <span className="line-clamp-2 text-xs text-muted-foreground/80">
                    {s.notes}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

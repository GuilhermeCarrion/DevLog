'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { NotesList } from '@/components/notes/notes-list';
import { SessionCard } from '@/components/sessions/session-card';
import { TasksTab } from '@/components/tasks/tasks-tab';
import { useProject } from '@/hooks/use-projects';
import { useSessions } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'sessoes', label: 'Sessões' },
  { key: 'notas', label: 'Notas' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Aba ativa vive na URL (?tab=) — recarregar/compartilhar preserva o estado
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey) ?? 'tasks';

  const { data: project, isLoading, isError } = useProject(id);
  const { data: sessions } = useSessions(id);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }
  if (isError || !project) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Voltar para projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project._count?.tasks ?? 0} tasks ·{' '}
            {project._count?.sessions ?? 0} sessões ·{' '}
            {project._count?.notes ?? 0} notas
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => router.replace(`/projetos/${id}?tab=${key}`)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm transition-colors cursor-pointer',
              tab === key
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && <TasksTab projectId={id} />}
      {tab === 'sessoes' && (
        <div className="flex flex-col gap-3">
          {!sessions?.length && (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhuma sessão neste projeto. Use o botão “Nova Sessão” no topo.
            </p>
          )}
          {sessions?.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
      {tab === 'notas' && <NotesList projectId={id} />}
    </div>
  );
}

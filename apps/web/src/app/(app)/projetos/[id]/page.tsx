'use client';

import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { NotesPanel } from '@/components/notes/notes-panel';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { SessionCard } from '@/components/sessions/session-card';
import { TasksTab } from '@/components/tasks/tasks-tab';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/use-projects';
import { useSessions } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'sessoes', label: 'Sessões' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Aba ativa vive na URL (?tab=) — recarregar/compartilhar preserva o estado
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  // Valida contra as abas atuais (URLs antigas com ?tab=notas caem em tasks)
  const tab: TabKey = TABS.some((t) => t.key === tabParam)
    ? (tabParam as TabKey)
    : 'tasks';
  const [editOpen, setEditOpen] = useState(false);

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
      <div className="flex items-start gap-3">
        <Link
          href="/"
          className="mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              title="Editar projeto"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
          {project.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs"
                  style={{ background: `${tag.color}22`, color: tag.color }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {project._count?.tasks ?? 0} tasks ·{' '}
            {project._count?.sessions ?? 0} sessões ·{' '}
            {project._count?.notes ?? 0} notas
          </p>
        </div>
      </div>

      {/* Conteúdo principal (Tasks/Sessões) + painel lateral de Notas & recados */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Segmented tabs — aba ativa em accent lima */}
          <div className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => router.replace(`/projetos/${id}?tab=${key}`)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm transition-colors cursor-pointer',
                  tab === key
                    ? 'bg-primary/15 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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
        </div>

        <NotesPanel projectId={id} />
      </div>

      <ProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

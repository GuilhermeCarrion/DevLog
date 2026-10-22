'use client';

import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CalcCard } from '@/components/calc/calc-card';
import { CalcTab } from '@/components/calc/calc-tab';
import { NotesPanel } from '@/components/notes/notes-panel';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { SessionCard } from '@/components/sessions/session-card';
import { TasksTab } from '@/components/tasks/tasks-tab';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/use-projects';
import { useSessions } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'sessoes', label: 'Sessões' },
  { key: 'calc', label: 'Calculadora' },
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
      <PageHeader
        eyebrow={
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeft aria-hidden="true" className="size-3" />
            Projetos
          </Link>
        }
        title={project.name}
        description={
          project.description ? (
            <span className="whitespace-pre-wrap">{project.description}</span>
          ) : undefined
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden="true" />
            Editar Projeto
          </Button>
        }
      >
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          {project.tags?.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
              style={{
                background: `${tag.color}1a`,
                borderColor: `${tag.color}4d`,
                color: tag.color,
              }}
            >
              <span aria-hidden="true" className="size-1.5" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ))}
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {project._count?.tasks ?? 0} tasks · {project._count?.sessions ?? 0} sessões ·{' '}
            {project._count?.notes ?? 0} notas
          </span>
        </div>
      </PageHeader>

      {/* Segmented tabs — aba ativa em accent lima */}
      <div role="tablist" className="flex gap-6 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.replace(`/projetos/${id}?tab=${key}`)}
            className={cn(
              'relative -mb-px border-b-2 px-0.5 pb-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer',
              tab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Calculadora ocupa a tela toda (sem notas nem totalizador aqui) */}
      {tab === 'calc' ? (
        <CalcTab project={project} sessions={sessions ?? []} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {tab === 'tasks' && <TasksTab projectId={id} />}
            {tab === 'sessoes' && (
              <div className="flex flex-col gap-3">
                {!sessions?.length && (
                  <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    Nenhuma sessão neste projeto. Use o botão “Nova Sessão” no
                    topo.
                  </p>
                )}
                {sessions?.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </div>

          {/* Coluna lateral: calculadora (resumo) em cima de Notas & recados */}
          <div className="flex flex-col gap-6">
            <CalcCard project={project} sessions={sessions ?? []} />
            <NotesPanel projectId={id} />
          </div>
        </div>
      )}

      <ProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

'use client';

import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ArrowUpRight,
  Pencil,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Button } from '@/components/ui/button';
import { DotField } from '@/components/ui/dot-field';
import { useMe } from '@/hooks/use-auth';
import { useProjects, useUpdateProject } from '@/hooks/use-projects';
import type { Project } from '@/lib/types';

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const { data: me } = useMe();
  const updateProject = useUpdateProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  const active = projects?.filter((p) => !p.archived) ?? [];
  const archived = projects?.filter((p) => p.archived) ?? [];
  const sum = (k: 'tasks' | 'sessions' | 'notes') =>
    active.reduce((acc, p) => acc + (p._count?.[k] ?? 0), 0);
  const stats = [
    { label: 'Projetos ativos', value: active.length },
    { label: 'Tasks', value: sum('tasks') },
    { label: 'Sessões', value: sum('sessions') },
    { label: 'Notas', value: sum('notes') },
  ];
  const firstName = me?.name?.split(' ')[0];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero: o ">_" da marca emergindo do ruído em pontos */}
      <section className="frame relative overflow-hidden rounded-md border border-border bg-card">
        <div className="relative">
        <div className="absolute inset-0">
          <DotField glyph=">_" cell={8} coverage={0.4} />
        </div>
        {/* vinheta: garante leitura do texto sobre os pontos */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/10"
        />

        <div className="relative flex max-w-xl flex-col items-start gap-5 px-8 pb-10 pt-12">
          <p className="label-mono inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-foreground/80">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            {greeting()}
            {firstName ? `, ${firstName}` : ''} · {dateFmt.format(new Date())}
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Seus projetos,
            <span className="serif-accent block text-[1.18em] text-foreground/90">
              em movimento.
            </span>
          </h1>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Tasks, sessões e notas de cada projeto num só lugar. Abra um projeto
            para continuar de onde parou.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Novo Projeto
            </Button>
            <Button variant="outline" asChild>
              <Link href="/agenda">
                Ver Agenda
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        </div>

        {/* Números do momento — mesma linguagem da referência */}
        <dl className="relative grid grid-cols-2 border-t border-border bg-background/60 backdrop-blur-sm sm:grid-cols-4 sm:divide-x sm:divide-border">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-1 px-6 py-4">
              <dt className="label-mono">{s.label}</dt>
              <dd className="serif-accent text-3xl tabular-nums text-foreground">
                {isLoading ? '—' : s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Projetos ativos */}
      <section aria-labelledby="ativos" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="ativos" className="label-mono">
            Ativos · {active.length}
          </h2>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {!isLoading && active.length === 0 && (
          <div className="frame flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card/50 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro para começar a registrar sessões.
            </p>
            <Button variant="outline" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Criar Projeto
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              onEdit={() => {
                setEditing(project);
                setDialogOpen(true);
              }}
              onArchive={() => updateProject.mutate({ id: project.id, archived: true })}
            />
          ))}
        </div>
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="arquivados" className="flex flex-col gap-3">
          <h2 id="arquivados" className="label-mono">
            Arquivados · {archived.length}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card/60">
            {archived.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {project.name}
                </span>
                <button
                  aria-label={`Restaurar ${project.name}`}
                  title="Restaurar"
                  onClick={() => updateProject.mutate({ id: project.id, archived: false })}
                  className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
                >
                  <ArchiveRestore aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProjectDialog project={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

// Card do projeto: o link "estica" sobre o card inteiro (sem <button> dentro de
// <a>); as ações ficam por cima com z-10. Pontos aparecem no hover.
function ProjectCard({
  project,
  index,
  onEdit,
  onArchive,
}: {
  project: Project;
  index: number;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const iconBtn =
    'rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer';
  return (
    <article className="group frame relative isolate flex min-h-48 flex-col gap-3 rounded-md border border-border bg-card p-5 transition-colors hover:border-border-strong">
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(to_bottom_left,black,transparent_65%)] group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-2">
        <span className="label-mono">Projeto {String(index + 1).padStart(2, '0')}</span>
        <div className="relative z-10 flex gap-0.5">
          <button onClick={onEdit} aria-label={`Editar ${project.name}`} title="Editar" className={iconBtn}>
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
          <button onClick={onArchive} aria-label={`Arquivar ${project.name}`} title="Arquivar" className={iconBtn}>
            <Archive aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold leading-tight tracking-tight">
        <Link
          href={`/projetos/${project.id}`}
          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
        >
          {project.name}
        </Link>
      </h3>

      {project.description && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      )}

      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium"
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
        </div>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-dashed border-border pt-3 font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>{project._count?.tasks ?? 0} tasks</span>
        <span>{project._count?.sessions ?? 0} sessões</span>
        <span>{project._count?.notes ?? 0} notas</span>
        <ArrowUpRight
          aria-hidden="true"
          className="ml-auto size-4 transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </article>
  );
}

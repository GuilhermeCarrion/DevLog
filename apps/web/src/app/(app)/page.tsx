'use client';

import { Archive, ArchiveRestore, FolderKanban, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects, useUpdateProject } from '@/hooks/use-projects';
import { formatDate } from '@/lib/format';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const updateProject = useUpdateProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  const active = projects?.filter((p) => !p.archived) ?? [];
  const archived = projects?.filter((p) => p.archived) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Seus projetos e o que está acontecendo em cada um
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && active.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderKanban className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro para começar a registrar
              sessões.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="size-4" />
              Criar projeto
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((project) => (
          <Link key={project.id} href={`/projetos/${project.id}`}>
            <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      title="Editar"
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditing(project);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      title="Arquivar"
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        updateProject.mutate({ id: project.id, archived: true });
                      }}
                    >
                      <Archive className="size-3.5" />
                    </button>
                  </div>
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70">
                  criado em {formatDate(project.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3">
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background: `${tag.color}22`,
                          color: tag.color,
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {project._count?.tasks ?? 0} tasks
                  </Badge>
                  <Badge variant="secondary">
                    {project._count?.sessions ?? 0} sessões
                  </Badge>
                  <Badge variant="secondary">
                    {project._count?.notes ?? 0} notas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {archived.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Arquivados
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((project) => (
              <Card key={project.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <button
                      title="Restaurar"
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                      onClick={() =>
                        updateProject.mutate({ id: project.id, archived: false })
                      }
                    >
                      <ArchiveRestore className="size-3.5" />
                    </button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ProjectDialog
        project={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

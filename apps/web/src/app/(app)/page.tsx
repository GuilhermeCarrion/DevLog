'use client';

import { Archive, ArchiveRestore, FolderKanban, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProject, useProjects, useUpdateProject } from '@/hooks/use-projects';
import { formatDate } from '@/lib/format';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleCreate() {
    if (!name.trim()) return;
    createProject.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          toast.success('Projeto criado!');
        },
        onError: (e) => toast.error(e.message),
      },
    );
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
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}

      {!isLoading && active.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderKanban className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum projeto ainda. Crie o primeiro para começar a registrar
              sessões.
            </p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="size-4" />
              Criar projeto
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((project) => (
          <Link key={project.id} href={`/projetos/${project.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  criado em {formatDate(project.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Badge variant="secondary">
                  {project._count?.tasks ?? 0} tasks
                </Badge>
                <Badge variant="secondary">
                  {project._count?.sessions ?? 0} sessões
                </Badge>
                <Badge variant="secondary">
                  {project._count?.notes ?? 0} notas
                </Badge>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: TCC, DevLog, Moven…"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

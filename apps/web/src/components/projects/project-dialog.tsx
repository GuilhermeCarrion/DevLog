'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TagPicker } from '@/components/projects/tag-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject, useUpdateProject } from '@/hooks/use-projects';
import type { Project } from '@/lib/types';

// Dialog único de criar/editar projeto (project == null → criar)
export function ProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setDescription(project?.description ?? '');
      setTagIds(project?.tags?.map((t) => t.id) ?? []);
    }
  }, [open, project]);

  function handleSubmit() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      tagIds,
    };
    const options = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(project ? 'Projeto atualizado!' : 'Projeto criado!');
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (project) updateProject.mutate({ id: project.id, ...data }, options);
    else createProject.mutate(data, options);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'Editar projeto' : 'Novo projeto'}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-desc">Descrição</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Do que se trata este projeto, objetivos, contexto…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <TagPicker value={tagIds} onChange={setTagIds} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending || updateProject.isPending}
            >
              {project ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

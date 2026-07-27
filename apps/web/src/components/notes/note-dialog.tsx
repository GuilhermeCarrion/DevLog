'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateNote, useDeleteNote, useUpdateNote } from '@/hooks/use-notes';
import { useProjects } from '@/hooks/use-projects';
import type { Note } from '@/lib/types';

// Editor de nota com preview markdown lado a lado (Escrever / Visualizar).
// fixedProjectId: quando aberto de dentro de um projeto, trava o vínculo.
export function NoteDialog({
  note,
  fixedProjectId,
  open,
  onOpenChange,
}: {
  note: Note | null;
  fixedProjectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? '');
      setContent(note?.content ?? '');
      setProjectId(note?.projectId ?? fixedProjectId ?? '');
      setPreview(false);
    }
  }, [open, note, fixedProjectId]);

  function handleSubmit() {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      content,
      projectId: projectId || null,
    };
    const options = {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(note ? 'Nota atualizada!' : 'Nota criada!');
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (note) updateNote.mutate({ id: note.id, ...data }, options);
    else createNote.mutate(data, options);
  }

  function handleDelete() {
    if (!note) return;
    deleteNote.mutate(note.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Nota excluída');
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? 'Editar nota' : 'Nova nota'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-title">Título</Label>
              <Input
                id="note-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-project">Projeto</Label>
              <Select
                id="note-project"
                value={projectId}
                disabled={!!fixedProjectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Sem projeto</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Conteúdo (markdown)</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-0.5 text-xs">
                {(['Escrever', 'Visualizar'] as const).map((mode, i) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreview(i === 1)}
                    className={`rounded px-2 py-1 transition-colors cursor-pointer ${
                      preview === (i === 1)
                        ? 'bg-card font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="prose-devlog min-h-48 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
                <ReactMarkdown>{content || '*Nada para mostrar*'}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder={'# Título\n\n- lista\n- **negrito**, *itálico*, `código`'}
                className="font-mono text-xs"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          {note && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createNote.isPending || updateNote.isPending}
          >
            {note ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

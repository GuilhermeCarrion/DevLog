'use client';

import { NotebookPen, Plus } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { NoteDialog } from '@/components/notes/note-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/hooks/use-notes';
import { formatDate } from '@/lib/format';
import type { Note } from '@/lib/types';

// Lista de notas reutilizada na aba do projeto (projectId definido)
// e na tela global /notas (sem projectId)
export function NotesList({ projectId }: { projectId?: string }) {
  const { data: notes, isLoading } = useNotes(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nova nota
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && !notes?.length && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <NotebookPen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {notes?.map((note) => (
          <button
            key={note.id}
            onClick={() => {
              setEditing(note);
              setDialogOpen(true);
            }}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{note.title}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {formatDate(note.createdAt)}
              </span>
            </div>
            {!projectId && note.project && (
              <Badge variant="outline" className="self-start">
                {note.project.name}
              </Badge>
            )}
            <div className="prose-devlog line-clamp-4 text-xs text-muted-foreground">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          </button>
        ))}
      </div>

      <NoteDialog
        note={editing}
        fixedProjectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

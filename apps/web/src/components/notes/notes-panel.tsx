'use client';

import { NotebookPen } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { NoteDialog } from '@/components/notes/note-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateNote, useNotes } from '@/hooks/use-notes';
import { formatDate } from '@/lib/format';
import type { Note } from '@/lib/types';

// Painel lateral de notas/recados do projeto — visível ao lado de Tasks e Sessões.
// Quick-add cria um recado na hora; clicar num recado abre o editor markdown completo.
export function NotesPanel({ projectId }: { projectId: string }) {
  const { data: notes } = useNotes(projectId);
  const createNote = useCreateNote();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function quickAdd() {
    const t = text.trim();
    if (!t) return;
    const title = t.split('\n')[0].slice(0, 60);
    createNote.mutate(
      { title, content: t, projectId },
      {
        onSuccess: () => setText(''),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <aside className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Notas & recados</h3>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter adiciona rápido
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              quickAdd();
            }
          }}
          rows={2}
          placeholder="Escreva um recado rápido…"
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={quickAdd}
          disabled={createNote.isPending || !text.trim()}
        >
          Adicionar recado
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {!notes?.length && (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Nenhum recado ainda.
          </p>
        )}
        {notes?.map((note) => (
          <button
            key={note.id}
            onClick={() => {
              setEditing(note);
              setDialogOpen(true);
            }}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 cursor-pointer"
          >
            <span className="truncate text-sm font-medium">{note.title}</span>
            {note.content && note.content !== note.title && (
              <div className="prose-devlog line-clamp-3 text-xs text-muted-foreground">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground/60">
              {formatDate(note.createdAt)}
            </span>
          </button>
        ))}
      </div>

      <NoteDialog
        note={editing}
        fixedProjectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </aside>
  );
}

'use client';

import { NotesList } from '@/components/notes/notes-list';

export default function NotasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
        <p className="text-sm text-muted-foreground">
          Todas as suas notas — com ou sem projeto
        </p>
      </div>
      <NotesList />
    </div>
  );
}

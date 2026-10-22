'use client';

import { PageHeader } from '@/components/layout/page-header';
import { NotesList } from '@/components/notes/notes-list';

export default function NotasPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="04 · Notas"
        title="Notas"
        accent="& ideias."
        description="Todas as suas notas — com ou sem projeto."
      />
      <NotesList />
    </div>
  );
}

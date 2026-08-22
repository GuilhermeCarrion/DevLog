'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ReportProfileInput,
  useUpsertReportProfile,
} from '@/hooks/use-reports';
import type { ReportProfile } from '@/lib/types';

const EMPTY: ReportProfileInput = {
  grupoTurma: '',
  aluno: '',
  ra: '',
  curso: '',
  termo: '',
  orientador: '',
  coorientador: '',
  tema: '',
  area: '',
};

// Campos do cabeçalho do relatório — o que NÃO vem de tasks/sessões (aluno, RA,
// curso, orientadores, tema…). Salvos por projeto no ReportProfile.
const FIELDS: {
  key: keyof ReportProfileInput;
  label: string;
  placeholder?: string;
  full?: boolean;
  optional?: boolean;
}[] = [
  { key: 'aluno', label: 'Aluno', placeholder: 'Nome completo' },
  { key: 'ra', label: 'RA', placeholder: 'ex: 219693' },
  { key: 'grupoTurma', label: 'Grupo / Turma', placeholder: 'ex: TDS-2026-013' },
  { key: 'termo', label: 'Termo', placeholder: 'ex: 5º' },
  { key: 'curso', label: 'Curso', full: true },
  { key: 'orientador', label: 'Orientador' },
  { key: 'coorientador', label: 'Coorientador', optional: true },
  { key: 'tema', label: 'Tema', full: true },
  { key: 'area', label: 'Área', full: true },
];

export function ReportProfileForm({
  projectId,
  profile,
  onSaved,
}: {
  projectId: string;
  profile: ReportProfile | null | undefined;
  onSaved?: () => void;
}) {
  const upsert = useUpsertReportProfile(projectId);
  const [form, setForm] = useState<ReportProfileInput>(EMPTY);

  useEffect(() => {
    if (profile) {
      setForm({
        grupoTurma: profile.grupoTurma,
        aluno: profile.aluno,
        ra: profile.ra,
        curso: profile.curso,
        termo: profile.termo,
        orientador: profile.orientador,
        coorientador: profile.coorientador ?? '',
        tema: profile.tema,
        area: profile.area,
      });
    } else {
      setForm(EMPTY);
    }
  }, [profile]);

  function set<K extends keyof ReportProfileInput>(
    key: K,
    value: ReportProfileInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Obrigatórios: todos menos coorientador
    const missing = FIELDS.filter(
      (f) => !f.optional && !String(form[f.key]).trim(),
    );
    if (missing.length) {
      toast.error(`Preencha: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    upsert.mutate(
      { ...form, coorientador: form.coorientador?.trim() || null },
      {
        onSuccess: () => {
          toast.success('Dados do relatório salvos!');
          onSaved?.();
        },
        onError: (er) => toast.error(er.message),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className={`flex flex-col gap-1.5 ${f.full ? 'sm:col-span-2' : ''}`}
          >
            <Label>
              {f.label}
              {f.optional && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (opcional)
                </span>
              )}
            </Label>
            <Input
              value={form[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={upsert.isPending}>
          {profile ? 'Salvar dados' : 'Salvar e continuar'}
        </Button>
      </div>
    </form>
  );
}

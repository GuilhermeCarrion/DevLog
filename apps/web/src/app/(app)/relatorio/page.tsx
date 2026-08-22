'use client';

import { Download, FileText, History, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ReportProfileForm } from '@/components/reports/report-profile-form';
import { ReportReview } from '@/components/reports/report-review';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  useDownloadReport,
  useLoadCandidates,
  useReportProfile,
  useReports,
} from '@/hooks/use-reports';
import { useProjects } from '@/hooks/use-projects';
import type { ReportCandidates } from '@/lib/types';

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RelatorioPage() {
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState('');
  const { data: profile, isLoading: loadingProfile } =
    useReportProfile(projectId || null);
  const loadCandidates = useLoadCandidates(projectId);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [candidates, setCandidates] = useState<ReportCandidates | null>(null);

  const hasProfile = !!profile;

  function revisar() {
    if (!from || !to) {
      toast.error('Escolha o intervalo de datas (De / Até).');
      return;
    }
    loadCandidates.mutate(
      { from, to },
      {
        onSuccess: (data) => setCandidates(data),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const projectOptions = [
    { value: '', label: 'Selecione um projeto' },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  // ----- Modo revisão -----
  if (candidates && projectId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Revisar relatório
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajuste as linhas, selecione as próximas tarefas e puxe as notas das
            sessões antes de gerar.
          </p>
        </div>
        <ReportReview
          projectId={projectId}
          candidates={candidates}
          from={from}
          to={to}
          initialSemana={candidates.suggestedSemana}
          initialPercentTotal={String(candidates.suggestedPercentTotal)}
          onBack={() => setCandidates(null)}
        />
      </div>
    );
  }

  // ----- Modo setup -----
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatório</h1>
        <p className="text-sm text-muted-foreground">
          Gera o relatório semanal (.docx) do projeto a partir das sessões e
          tasks no intervalo escolhido.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select
              value={projectId}
              onValueChange={(v) => {
                setProjectId(v);
                setCandidates(null);
              }}
              options={projectOptions}
            />
          </div>
        </CardContent>
      </Card>

      {projectId && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                Dados do relatório
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Aluno, RA, curso, orientadores, tema — preenchidos uma vez por
                projeto. Vão para o cabeçalho do documento.
              </p>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (
                <ReportProfileForm projectId={projectId} profile={profile} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preparar relatório</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!hasProfile && !loadingProfile && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                  <TriangleAlert className="size-4 shrink-0 text-primary" />
                  Preencha e salve os dados do relatório acima para poder gerar.
                </div>
              )}
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-[10rem]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-[10rem]"
                  />
                </div>
                <Button
                  onClick={revisar}
                  disabled={!hasProfile || !from || !to || loadCandidates.isPending}
                >
                  <Sparkles className="size-4" />
                  {loadCandidates.isPending ? 'Carregando…' : 'Revisar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <ReportHistory projectId={projectId} />
        </>
      )}
    </div>
  );
}

function ReportHistory({ projectId }: { projectId: string }) {
  const { data: reports } = useReports(projectId);
  const download = useDownloadReport(projectId);

  if (!reports?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-border/60">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Semana {r.week}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtDateTime(r.generatedAt)} · {r.percentTotal}% conclusão
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={download.isPending}
                onClick={() =>
                  download.mutate(r.id, {
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <Download className="size-4" />
                Rebaixar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

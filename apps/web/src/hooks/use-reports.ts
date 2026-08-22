'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ReportCandidates,
  ReportHistoryItem,
  ReportProfile,
  ReportRow,
} from '@/lib/types';

// ---------- ReportProfile (config do cabeçalho, por projeto) ----------

export interface ReportProfileInput {
  grupoTurma: string;
  aluno: string;
  ra: string;
  curso: string;
  termo: string;
  orientador: string;
  coorientador?: string | null;
  tema: string;
  area: string;
}

export function useReportProfile(projectId: string | null) {
  return useQuery({
    queryKey: ['report-profile', projectId],
    queryFn: () =>
      api.get<ReportProfile | null>(`/projects/${projectId}/report-profile`),
    enabled: !!projectId,
  });
}

export function useUpsertReportProfile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportProfileInput) =>
      api.put<ReportProfile>(`/projects/${projectId}/report-profile`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['report-profile', projectId] }),
  });
}

// ---------- Candidatos (tela de revisão) ----------

// Carrega os candidatos pré-preenchidos para o intervalo (via mutation porque a
// tela de revisão trabalha com uma cópia editável em estado local).
export function useLoadCandidates(projectId: string) {
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      api.get<ReportCandidates>(
        `/projects/${projectId}/reports/candidates?from=${from}&to=${to}`,
      ),
  });
}

// ---------- Geração do .docx ----------

export interface GenerateReportInput {
  from: string;
  to: string;
  semana?: string;
  data?: string;
  percentTotal?: number;
  realizadas?: ReportRow[];
  proximas?: ReportRow[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useGenerateReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateReportInput) => {
      const { blob, filename } = await api.postBlob(
        `/projects/${projectId}/reports/generate`,
        data,
      );
      triggerDownload(blob, filename);
      return filename;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', projectId] }),
  });
}

// ---------- Histórico ----------

export function useReports(projectId: string | null) {
  return useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => api.get<ReportHistoryItem[]>(`/projects/${projectId}/reports`),
    enabled: !!projectId,
  });
}

export function useDownloadReport(projectId: string) {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { blob, filename } = await api.getBlob(
        `/projects/${projectId}/reports/${reportId}/download`,
      );
      triggerDownload(blob, filename);
      return filename;
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CalcSettings,
  CostCategory,
  CostItem,
  CostKind,
  CostPeriod,
  CostTemplate,
  PeriodCategory,
} from '@/lib/types';

export interface CostInput {
  name: string;
  category: CostCategory;
  kind: CostKind;
  amount: number;
  hours?: number | null;
}

// ---------- itens por projeto ----------

export function useCostItems(projectId: string) {
  return useQuery({
    queryKey: ['costs', projectId],
    queryFn: () => api.get<CostItem[]>(`/projects/${projectId}/costs`),
  });
}

export function useCreateCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CostInput) =>
      api.post<CostItem>(`/projects/${projectId}/costs`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['costs', projectId] }),
  });
}

export function useUpdateCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CostInput> & { id: string }) =>
      api.patch<CostItem>(`/costs/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['costs', projectId] }),
  });
}

export function useDeleteCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/costs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['costs', projectId] }),
  });
}

// ---------- templates reutilizáveis ----------

export function useCostTemplates() {
  return useQuery({
    queryKey: ['cost-templates'],
    queryFn: () => api.get<CostTemplate[]>('/cost-templates'),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CostInput) =>
      api.post<CostTemplate>('/cost-templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CostInput> & { id: string }) =>
      api.patch<CostTemplate>(`/cost-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cost-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-templates'] }),
  });
}

// ---------- settings (defaults globais) ----------

export function useCalcSettings() {
  return useQuery({
    queryKey: ['calc-settings'],
    queryFn: () => api.get<CalcSettings>('/calc-settings'),
  });
}

export function useUpdateCalcSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CalcSettings>) =>
      api.patch<CalcSettings>('/calc-settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calc-settings'] }),
  });
}

// ---------- categorias de período (reutilizáveis) ----------

export interface PeriodCategoryInput {
  name: string;
  color: string;
}

export function usePeriodCategories() {
  return useQuery({
    queryKey: ['period-categories'],
    queryFn: () => api.get<PeriodCategory[]>('/period-categories'),
  });
}

export function useCreatePeriodCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PeriodCategoryInput) =>
      api.post<PeriodCategory>('/period-categories', data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['period-categories'] }),
  });
}

export function useUpdatePeriodCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PeriodCategoryInput> & { id: string }) =>
      api.patch<PeriodCategory>(`/period-categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period-categories'] });
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
  });
}

export function useDeletePeriodCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/period-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period-categories'] });
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
  });
}

// ---------- lançamentos de período por projeto ----------

export interface PeriodInput {
  categoryId?: string | null;
  label?: string | null;
  startDate: string;
  endDate: string;
  hours: number;
  amount: number;
  note?: string | null;
}

export function usePeriods(projectId: string) {
  return useQuery({
    queryKey: ['periods', projectId],
    queryFn: () => api.get<CostPeriod[]>(`/projects/${projectId}/periods`),
  });
}

export function useCreatePeriod(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PeriodInput) =>
      api.post<CostPeriod>(`/projects/${projectId}/periods`, data),
    onSuccess: () => {
      // custos ativos foram arquivados no período → recarrega ambas as listas
      qc.invalidateQueries({ queryKey: ['periods', projectId] });
      qc.invalidateQueries({ queryKey: ['costs', projectId] });
    },
  });
}

// Reabrir: devolve os custos arquivados para a lista ativa e apaga o histórico
export function useReopenPeriod(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/periods/${id}/reopen`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periods', projectId] });
      qc.invalidateQueries({ queryKey: ['costs', projectId] });
    },
  });
}

export function useUpdatePeriod(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PeriodInput> & { id: string }) =>
      api.patch<CostPeriod>(`/periods/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['periods', projectId] }),
  });
}

export function useDeletePeriod(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/periods/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['periods', projectId] }),
  });
}

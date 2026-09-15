'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  InstallmentPlan,
  RecurrenceInterval,
  RecurringRule,
  SavingsBox,
  SavingsEntry,
  TxType,
  WalletCategory,
  WalletSummary,
  WalletTransaction,
} from '@/lib/types';

// Toda mutação da carteira invalida o prefixo ['wallet'] — cobre lançamentos,
// resumo, recorrentes, parcelas e categorias de uma vez.
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['wallet'] });
}

// ---------- categorias ----------

export function useWalletCategories() {
  return useQuery({
    queryKey: ['wallet', 'categories'],
    queryFn: () => api.get<WalletCategory[]>('/wallet/categories'),
  });
}

export function useCreateWalletCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<WalletCategory>('/wallet/categories', data),
    onSuccess: invalidate,
  });
}

export function useUpdateWalletCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch<WalletCategory>(`/wallet/categories/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteWalletCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallet/categories/${id}`),
    onSuccess: invalidate,
  });
}

// ---------- transações ----------

export interface TransactionInput {
  type: TxType;
  amount: number;
  date: string;
  description: string;
  categoryId?: string | null;
  paid?: boolean;
}

export function useTransactions(
  month: string,
  filters?: { type?: TxType | ''; categoryId?: string; paid?: string },
) {
  const params = new URLSearchParams({ month });
  if (filters?.type) params.set('type', filters.type);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.paid) params.set('paid', filters.paid);
  return useQuery({
    queryKey: ['wallet', 'transactions', month, filters],
    queryFn: () =>
      api.get<WalletTransaction[]>(`/wallet/transactions?${params.toString()}`),
  });
}

export function useCreateTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: TransactionInput) =>
      api.post<WalletTransaction>('/wallet/transactions', data),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TransactionInput> & { id: string }) =>
      api.patch<WalletTransaction>(`/wallet/transactions/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useTogglePaid() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<WalletTransaction>(`/wallet/transactions/${id}/toggle-paid`),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallet/transactions/${id}`),
    onSuccess: invalidate,
  });
}

// ---------- resumo ----------

export function useWalletSummary(month: string) {
  return useQuery({
    queryKey: ['wallet', 'summary', month],
    queryFn: () => api.get<WalletSummary>(`/wallet/summary?month=${month}`),
  });
}

// ---------- recorrentes ----------

export interface RecurringInput {
  type: TxType;
  amount: number;
  description: string;
  categoryId?: string | null;
  interval?: RecurrenceInterval;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string | null;
}

export function useRecurringRules() {
  return useQuery({
    queryKey: ['wallet', 'recurring'],
    queryFn: () => api.get<RecurringRule[]>('/wallet/recurring'),
  });
}

export function useCreateRecurring() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: RecurringInput) =>
      api.post<RecurringRule>('/wallet/recurring', data),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurring() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RecurringInput> & { id: string; active?: boolean }) =>
      api.patch<RecurringRule>(`/wallet/recurring/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteRecurring() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, keep }: { id: string; keep: boolean }) =>
      api.delete(`/wallet/recurring/${id}?keep=${keep}`),
    onSuccess: invalidate,
  });
}

// ---------- parcelas ----------

export interface InstallmentInput {
  type?: TxType;
  description: string;
  categoryId?: string | null;
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: string;
}

export function useInstallments() {
  return useQuery({
    queryKey: ['wallet', 'installments'],
    queryFn: () => api.get<InstallmentPlan[]>('/wallet/installments'),
  });
}

export function useCreateInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: InstallmentInput) =>
      api.post<InstallmentPlan>('/wallet/installments', data),
    onSuccess: invalidate,
  });
}

export function useUpdateInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      description?: string;
      categoryId?: string | null;
    }) => api.patch<InstallmentPlan>(`/wallet/installments/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallet/installments/${id}`),
    onSuccess: invalidate,
  });
}

// ---------- caixinhas (reserva/economias) ----------

export function useSavingsBoxes() {
  return useQuery({
    queryKey: ['wallet', 'savings'],
    queryFn: () => api.get<SavingsBox[]>('/wallet/savings'),
  });
}

export function useCreateSavingsBox() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post<SavingsBox>('/wallet/savings', data),
    onSuccess: invalidate,
  });
}

export function useUpdateSavingsBox() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch<SavingsBox>(`/wallet/savings/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSavingsBox() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallet/savings/${id}`),
    onSuccess: invalidate,
  });
}

export interface SavingsEntryInput {
  amount: number;
  description?: string | null;
  date: string;
}

export function useAddSavingsEntry() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ boxId, ...data }: SavingsEntryInput & { boxId: string }) =>
      api.post<SavingsEntry>(`/wallet/savings/${boxId}/entries`, data),
    onSuccess: invalidate,
  });
}

export function useUpdateSavingsEntry() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SavingsEntryInput> & { id: string }) =>
      api.patch<SavingsEntry>(`/wallet/savings/entries/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSavingsEntry() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallet/savings/entries/${id}`),
    onSuccess: invalidate,
  });
}

// ---------- integração com a Calculadora ----------

export function useLaunchCostPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (costPeriodId: string) =>
      api.post<WalletTransaction>(`/wallet/from-cost-period/${costPeriodId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      // atualiza o "já lançado" no histórico de períodos da Calculadora
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
  });
}

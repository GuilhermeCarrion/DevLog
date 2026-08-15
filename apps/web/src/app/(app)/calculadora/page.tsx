'use client';

import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CostDialog, type CostDraft } from '@/components/calc/cost-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  useCalcSettings,
  useCostTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useUpdateCalcSettings,
  useUpdateTemplate,
} from '@/hooks/use-costs';
import { CATEGORY_META, formatBRL, KIND_LABEL } from '@/lib/calc';
import type { CostTemplate } from '@/lib/types';

export default function CalculadoraPage() {
  const { data: settings } = useCalcSettings();
  const { data: templates } = useCostTemplates();
  const updateSettings = useUpdateCalcSettings();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [rate, setRate] = useState('');
  const [margin, setMargin] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CostTemplate | null>(null);

  useEffect(() => {
    if (settings) {
      setRate(String(settings.defaultHourlyRate));
      setMargin(String(settings.defaultMargin));
    }
  }, [settings]);

  function saveSettings() {
    updateSettings.mutate(
      { defaultHourlyRate: Number(rate) || 0, defaultMargin: Number(margin) || 0 },
      {
        onSuccess: () => toast.success('Configurações salvas!'),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calculadora</h1>
        <p className="text-sm text-muted-foreground">
          Configure valores padrão e custos reutilizáveis. Cada projeto usa isso
          como base e pode ter seus próprios itens e margem.
        </p>
      </div>

      {/* Defaults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Valores padrão</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Valor/hora padrão (R$)</Label>
            <NumberInput
              value={rate}
              onValueChange={setRate}
              step={0.5}
              min={0}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Margem padrão (%)</Label>
            <NumberInput
              value={margin}
              onValueChange={setMargin}
              step={1}
              min={0}
              className="w-40"
            />
          </div>
          <Button onClick={saveSettings} disabled={updateSettings.isPending}>
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Custos padrão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reutilizáveis em qualquer projeto (ex: VPS, Claude Plus).
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo custo padrão
          </Button>
        </CardHeader>
        <CardContent>
          {!templates?.length && (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhum custo padrão ainda.
            </p>
          )}
          <div className="flex flex-col divide-y divide-border">
            {templates?.map((t) => {
              const meta = CATEGORY_META[t.category];
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setEditing(t);
                    setDialogOpen(true);
                  }}
                  className="group flex items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/40 cursor-pointer"
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: meta.color }}
                    />
                    {meta.short}
                  </span>
                  <span className="flex-1 text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.kind === 'HOURLY'
                      ? `${formatBRL(t.amount)}/h`
                      : formatBRL(t.amount)}
                  </span>
                  <Pencil className="size-3.5 text-muted-foreground/40 group-hover:text-foreground" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <CostDialog
        title={editing ? 'Editar custo padrão' : 'Novo custo padrão'}
        cost={editing as CostDraft | null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        saving={createTemplate.isPending || updateTemplate.isPending}
        onSave={(data) => {
          const opts = {
            onSuccess: () => {
              setDialogOpen(false);
              toast.success(editing ? 'Custo atualizado!' : 'Custo criado!');
            },
            onError: (e: Error) => toast.error(e.message),
          };
          if (editing) updateTemplate.mutate({ id: editing.id, ...data }, opts);
          else createTemplate.mutate(data, opts);
        }}
        onDelete={
          editing
            ? () => {
                if (!confirm(`Excluir o custo padrão "${editing.name}"?`)) return;
                deleteTemplate.mutate(editing.id, {
                  onSuccess: () => {
                    setDialogOpen(false);
                    toast.success('Custo padrão excluído');
                  },
                });
              }
            : undefined
        }
      />
    </div>
  );
}

'use client';

import { Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { useCalcSettings, useCostItems } from '@/hooks/use-costs';
import { useUpdateProject } from '@/hooks/use-projects';
import {
  calcTotals,
  CATEGORY_META,
  formatBRL,
  sessionsToHours,
} from '@/lib/calc';
import type { Project, WorkSession } from '@/lib/types';

// Card de resumo (totalizador) na tela do projeto: preço sugerido, breakdown
// colorido e margem editável. "Gerenciar" leva para a aba Calculadora.
export function CalcCard({
  project,
  sessions,
}: {
  project: Project;
  sessions: WorkSession[];
}) {
  const router = useRouter();
  const { data: items } = useCostItems(project.id);
  const { data: settings } = useCalcSettings();
  const updateProject = useUpdateProject();

  const autoHours = useMemo(() => sessionsToHours(sessions), [sessions]);
  const margin = project.marginPercent ?? settings?.defaultMargin ?? 0;
  const result = useMemo(
    () => calcTotals(items ?? [], autoHours, margin),
    [items, autoHours, margin],
  );

  // Draft local da margem — commita no servidor só no blur/stepper
  const [marginDraft, setMarginDraft] = useState(String(margin));
  useEffect(() => setMarginDraft(String(margin)), [margin]);
  function commitMargin(value: string) {
    const n = value === '' ? null : Number(value);
    if (n === project.marginPercent) return;
    updateProject.mutate({ id: project.id, marginPercent: n });
  }

  const custosTotais = result.custos + result.outros;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-primary" />
        <h3 className="text-sm font-medium">Calculadora de preço</h3>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 px-2 text-xs"
          onClick={() => router.replace(`/projetos/${project.id}?tab=calc`)}
        >
          Gerenciar
        </Button>
      </div>

      {/* Preço sugerido em destaque */}
      <div className="rounded-lg bg-primary/10 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wide text-primary/70">
          Preço sugerido
        </p>
        <p className="font-mono text-2xl font-semibold text-primary">
          {formatBRL(result.precoFinal)}
        </p>
      </div>

      {/* Mini-breakdown colorido */}
      <div className="flex flex-col gap-1.5 text-xs">
        <MiniRow
          color={CATEGORY_META.CUSTO.color}
          label="Custos"
          value={formatBRL(custosTotais)}
        />
        <MiniRow
          color={CATEGORY_META.DEV.color}
          label={`Mão de obra · ${result.devHoras.toFixed(1)}h`}
          value={formatBRL(result.dev)}
        />
        {result.desconto > 0 && (
          <MiniRow
            color={CATEGORY_META.DESCONTO.color}
            label="Descontos"
            value={`−${formatBRL(result.desconto)}`}
          />
        )}
      </div>

      {/* Margem editável */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Margem</span>
          <div className="w-20">
            <NumberInput
              value={marginDraft}
              onValueChange={setMarginDraft}
              onCommit={commitMargin}
              step={1}
              min={0}
              className="h-7 text-right text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <span className="font-mono text-xs text-primary">
          +{formatBRL(result.margemValor)}
        </span>
      </div>
    </div>
  );
}

function MiniRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono">{value}</span>
    </div>
  );
}

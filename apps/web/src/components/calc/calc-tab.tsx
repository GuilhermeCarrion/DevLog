"use client";

import { Clock, Import, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import {
  useCalcSettings,
  useCostItems,
  useCostTemplates,
  useCreateCostItem,
  useDeleteCostItem,
  useUpdateCostItem,
} from "@/hooks/use-costs";
import { useUpdateProject } from "@/hooks/use-projects";
import {
  calcTotals,
  CATEGORY_META,
  CATEGORY_ORDER,
  type DateRange,
  formatBRL,
  itemHours,
  itemSubtotal,
  sessionsToHours,
} from "@/lib/calc";
import type {
  CostCategory,
  CostItem,
  CostKind,
  Project,
  WorkSession,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { PeriodsSection } from "./periods-section";

// Aba "Calculadora": formulário inline de lançamento à esquerda + card
// "Custos lançados" (com totalizador e preço sugerido) à direita.
export function CalcTab({
  project,
  sessions,
}: {
  project: Project;
  sessions: WorkSession[];
}) {
  const { data: items } = useCostItems(project.id);
  const { data: templates } = useCostTemplates();
  const { data: settings } = useCalcSettings();
  const createItem = useCreateCostItem(project.id);
  const updateItem = useUpdateCostItem(project.id);
  const deleteItem = useDeleteCostItem(project.id);
  const updateProject = useUpdateProject();

  // Filtro de período: quando definido, a mão de obra automática soma só as
  // sessões que começaram no intervalo (senão, o total do projeto).
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const autoHours = useMemo(
    () => sessionsToHours(sessions, range),
    [sessions, range],
  );
  const margin = project.marginPercent ?? settings?.defaultMargin ?? 0;
  const result = useMemo(
    () => calcTotals(items ?? [], autoHours, margin),
    [items, autoHours, margin],
  );

  // ---- formulário de lançamento (inline; serve para criar e editar) ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CostCategory>("CUSTO");
  const [kind, setKind] = useState<CostKind>("FIXED");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("CUSTO");
    setKind("FIXED");
    setAmount("");
    setHours("");
  }

  function loadForEdit(item: CostItem) {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setKind(item.kind);
    setAmount(String(item.amount));
    setHours(item.hours != null ? String(item.hours) : "");
  }

  function selectCategory(c: CostCategory) {
    setCategory(c);
    if (c === "DEV") setKind("HOURLY"); // Dev normalmente é por hora
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      category,
      kind,
      amount: Number(amount) || 0,
      hours: kind === "HOURLY" && hours !== "" ? Number(hours) : null,
    };
    const opts = {
      onSuccess: () => resetForm(),
      onError: (er: Error) => toast.error(er.message),
    };
    if (editingId) updateItem.mutate({ id: editingId, ...data }, opts);
    else createItem.mutate(data, opts);
  }

  // ---- margem (draft local, commita no blur/stepper) ----
  const [marginDraft, setMarginDraft] = useState(String(margin));
  useEffect(() => setMarginDraft(String(margin)), [margin]);
  function commitMargin(value: string) {
    const n = value === "" ? null : Number(value);
    if (n === project.marginPercent) return;
    updateProject.mutate({ id: project.id, marginPercent: n });
  }

  const saving = createItem.isPending || updateItem.isPending;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      {/* ---------------- Formulário ---------------- */}
      <div className="flex flex-col gap-4">
        {/* Título do formulário + ações alinhadas (Dos padrões / Adicionar) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {editingId ? "Editar custo" : "Adicionar custo"}
          </h2>
          <div className="flex items-center gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={!templates?.length}>
                    <Import className="size-4" />
                    Dos padrões
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Adicionar um custo padrão a este projeto
                  </p>
                  <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                    {templates?.map((t) => {
                      const meta = CATEGORY_META[t.category];
                      return (
                        <button
                          key={t.id}
                          onClick={() =>
                            createItem.mutate({
                              name: t.name,
                              category: t.category,
                              kind: t.kind,
                              amount: t.amount,
                              hours: t.hours,
                            })
                          }
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent cursor-pointer"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: meta.color }}
                          />
                          <span className="flex-1 truncate">{t.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.kind === "HOURLY"
                              ? `${formatBRL(t.amount)}/h`
                              : formatBRL(t.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              type="submit"
              form="cost-form"
              disabled={saving || !name.trim()}
            >
              {editingId ? (
                "Salvar"
              ) : (
                <>
                  <Plus className="size-4" />
                  Adicionar custo
                </>
              )}
            </Button>
          </div>
        </div>

        <form
          id="cost-form"
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
        >
          {/* Categoria como pills coloridas */}
          <div className="flex flex-col gap-1.5">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((c) => {
                const meta = CATEGORY_META[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCategory(c)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                      !active &&
                        "border-border text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      active
                        ? {
                            background: `${meta.color}1f`,
                            borderColor: `${meta.color}99`,
                            color: meta.color,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: meta.color }}
                    />
                    {meta.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nome / descrição</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: VPS Hostinger, Claude Plus, Manutenção…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as CostKind)}
                options={[
                  { value: "FIXED", label: "Valor fixo" },
                  { value: "HOURLY", label: "Por hora" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                {kind === "HOURLY" ? "Valor / hora (R$)" : "Valor (R$)"}
              </Label>
              <NumberInput
                value={amount}
                onValueChange={setAmount}
                step={1}
                min={0}
                placeholder="0,00"
              />
            </div>
            {kind === "HOURLY" && (
              <div className="flex flex-col gap-1.5">
                <Label>Horas</Label>
                <NumberInput
                  value={hours}
                  onValueChange={setHours}
                  step={0.5}
                  min={0}
                  placeholder="auto (sessões)"
                />
              </div>
            )}
          </div>

          {kind === "HOURLY" && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Horas em branco = usa a soma das sessões
              {range.from || range.to ? " do período selecionado" : " do projeto"} (
              {autoHours.toFixed(1)}h).
            </p>
          )}
        </form>

        {/* Períodos de cobrança: filtro de intervalo + histórico de lançamentos */}
        <PeriodsSection
          project={project}
          range={range}
          onRangeChange={setRange}
          autoHours={autoHours}
          laborHours={result.devHoras}
          suggestedPrice={result.precoFinal}
          hasCosts={(items?.length ?? 0) > 0}
        />
      </div>

      {/* ---------------- Card: custos lançados + totalizador ---------------- */}
      <div className="flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custos lançados
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {result.devHoras.toFixed(1)}h em sessões
          </span>
        </div>

        {!items?.length && (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Nenhum custo lançado ainda.
          </p>
        )}

        <div className="flex flex-col divide-y divide-border/60">
          {items?.map((item) => {
            const meta = CATEGORY_META[item.category];
            const isDiscount = item.category === "DESCONTO";
            return (
              <div
                key={item.id}
                className="group flex items-center gap-2.5 py-2.5"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.kind === "HOURLY"
                      ? `${formatBRL(item.amount)}×${itemHours(item, autoHours).toFixed(1)}h`
                      : meta.short}
                  </p>
                </div>
                <span
                  className="shrink-0 font-mono text-sm"
                  style={isDiscount ? { color: meta.color } : undefined}
                >
                  {isDiscount ? "−" : ""}
                  {formatBRL(itemSubtotal(item, autoHours))}
                </span>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    title="Editar"
                    onClick={() => loadForEdit(item)}
                    className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground cursor-pointer"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    title="Excluir"
                    onClick={() => {
                      if (editingId === item.id) resetForm();
                      deleteItem.mutate(item.id, {
                        onError: (e) => toast.error(e.message),
                      });
                    }}
                    className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totalizador */}
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Subtotal</span>
            <span className="font-mono font-medium">
              {formatBRL(result.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Margem</span>
              <div className="w-16">
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
            <span className="font-mono text-sm text-primary">
              +{formatBRL(result.margemValor)}
            </span>
          </div>
          {result.desconto > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Descontos</span>
              <span
                className="font-mono"
                style={{ color: CATEGORY_META.DESCONTO.color }}
              >
                −{formatBRL(result.desconto)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-primary/70">
            Preço sugerido
          </p>
          <p className="font-mono text-2xl font-semibold text-primary">
            {formatBRL(result.precoFinal)}
          </p>
        </div>
      </div>
    </div>
  );
}

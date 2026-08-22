'use client';

import {
  ArrowLeft,
  ClipboardCopy,
  CornerDownLeft,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGenerateReport } from '@/hooks/use-reports';
import type {
  ReportCandidates,
  ReportCandidateTask,
  ReportRow,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskPreviewDialog } from './task-preview-dialog';

type Section = 'realizadas' | 'proximas';
type ProximaRow = ReportRow & { included: boolean };

// Cores por status (dot no select) — "mais cores para informação"
const STATUS_OPTIONS = [
  { value: 'Concluída', label: 'Concluída', color: '#a3e635' }, // lima
  { value: 'Em andamento', label: 'Em andamento', color: '#fbbf24' }, // âmbar
  { value: 'Em espera', label: 'Em espera', color: '#9aa0aa' }, // cinza
];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportReview({
  projectId,
  candidates,
  from,
  to,
  initialSemana,
  initialPercentTotal,
  onBack,
}: {
  projectId: string;
  candidates: ReportCandidates;
  from: string;
  to: string;
  initialSemana: string;
  initialPercentTotal: string;
  onBack: () => void;
}) {
  const generate = useGenerateReport(projectId);

  const [realizadas, setRealizadas] = useState<ReportRow[]>(
    candidates.realizadas.map((r) => ({ ...r })),
  );
  const [proximas, setProximas] = useState<ProximaRow[]>(
    candidates.proximas.map((r) => ({ ...r, included: true })),
  );
  const [semana, setSemana] = useState(initialSemana);
  const [percentTotal, setPercentTotal] = useState(initialPercentTotal);

  // Linha/campo em foco → destino do "inserir nota" do painel lateral
  const [focused, setFocused] = useState<{ section: Section; index: number } | null>(
    null,
  );
  const [preview, setPreview] = useState<ReportCandidateTask | null>(null);

  const taskById = useMemo(() => {
    const m = new Map<string, ReportCandidateTask>();
    for (const t of candidates.tasks) m.set(t.id, t);
    return m;
  }, [candidates.tasks]);

  const remainingTasks = useMemo(() => {
    const used = new Set(proximas.map((p) => p.taskId).filter(Boolean));
    return candidates.tasks.filter((t) => !used.has(t.id));
  }, [candidates.tasks, proximas]);

  // ---- edição de linhas ----
  function updateRealizada(i: number, patch: Partial<ReportRow>) {
    setRealizadas((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function updateProxima(i: number, patch: Partial<ProximaRow>) {
    setProximas((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }

  function insertNote(notes: string) {
    if (!focused) {
      toast.error('Clique numa justificativa primeiro para escolher o destino.');
      return;
    }
    const text = notes.trim();
    if (!text) return;
    const append = (j: string) => (j.trim() ? `${j.trim()}\n${text}` : text);
    if (focused.section === 'realizadas') {
      updateRealizada(focused.index, {
        justificativa: append(realizadas[focused.index]?.justificativa ?? ''),
      });
    } else {
      updateProxima(focused.index, {
        justificativa: append(proximas[focused.index]?.justificativa ?? ''),
      });
    }
  }

  async function copyNote(notes: string) {
    try {
      await navigator.clipboard.writeText(notes);
      toast.success('Nota copiada.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  function addManual(section: Section) {
    if (section === 'realizadas') {
      setRealizadas((r) => [
        ...r,
        { taskId: null, tarefa: '', status: 'Em andamento', percent: 0, justificativa: '' },
      ]);
    } else {
      setProximas((p) => [
        ...p,
        { taskId: null, tarefa: '', status: 'Em espera', justificativa: '', included: true },
      ]);
    }
  }

  function addTaskToProximas(taskId: string) {
    const t = taskById.get(taskId);
    if (!t) return;
    setProximas((p) => [
      ...p,
      {
        taskId: t.id,
        tarefa: t.title,
        status: 'Em espera',
        justificativa: t.description ?? '',
        included: true,
      },
    ]);
  }

  function gerar() {
    const realizadasOut: ReportRow[] = realizadas
      .filter((r) => r.tarefa.trim())
      .map((r) => ({
        tarefa: r.tarefa.trim(),
        status: r.status,
        percent: r.percent ?? 0,
        justificativa: r.justificativa,
      }));
    const proximasOut: ReportRow[] = proximas
      .filter((p) => p.included && p.tarefa.trim())
      .map((p) => ({
        tarefa: p.tarefa.trim(),
        status: p.status,
        justificativa: p.justificativa,
      }));

    generate.mutate(
      {
        from,
        to,
        semana: semana.trim() || undefined,
        percentTotal: percentTotal === '' ? undefined : Number(percentTotal),
        realizadas: realizadasOut,
        proximas: proximasOut,
      },
      {
        onSuccess: (filename) =>
          toast.success(`Relatório gerado e salvo: ${filename}`),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Semana</Label>
            <Input
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">% Conclusão</Label>
            <NumberInput
              value={percentTotal}
              onValueChange={setPercentTotal}
              min={0}
              max={100}
              className="w-24"
            />
          </div>
          <Button onClick={gerar} disabled={generate.isPending}>
            <Download className="size-4" />
            {generate.isPending ? 'Gerando…' : 'Gerar e baixar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
        {/* ---------- Coluna principal: linhas ---------- */}
        <div className="flex flex-col gap-5">
          {/* Realizadas */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Realizadas ({realizadas.length})
            </h3>
            {realizadas.map((row, i) => (
              <RowCard
                key={i}
                row={row}
                showPercent
                group={row.taskId ? taskById.get(row.taskId)?.group : null}
                focused={focused?.section === 'realizadas' && focused.index === i}
                onFocusJustificativa={() =>
                  setFocused({ section: 'realizadas', index: i })
                }
                onOpenTask={
                  row.taskId ? () => setPreview(taskById.get(row.taskId!) ?? null) : undefined
                }
                onChange={(patch) => updateRealizada(i, patch)}
                onRemove={() =>
                  setRealizadas((r) => r.filter((_, idx) => idx !== i))
                }
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => addManual('realizadas')}
            >
              <Plus className="size-4" />
              Adicionar linha manual
            </Button>
          </section>

          {/* Próximas */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Próximas tarefas ({proximas.filter((p) => p.included).length})
            </h3>
            {proximas.map((row, i) => (
              <RowCard
                key={i}
                row={row}
                group={row.taskId ? taskById.get(row.taskId)?.group : null}
                included={row.included}
                onToggleInclude={() => updateProxima(i, { included: !row.included })}
                focused={focused?.section === 'proximas' && focused.index === i}
                onFocusJustificativa={() =>
                  setFocused({ section: 'proximas', index: i })
                }
                onOpenTask={
                  row.taskId ? () => setPreview(taskById.get(row.taskId!) ?? null) : undefined
                }
                onChange={(patch) => updateProxima(i, patch)}
                onRemove={() =>
                  setProximas((r) => r.filter((_, idx) => idx !== i))
                }
              />
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <Select
                  value=""
                  onValueChange={(v) => v && addTaskToProximas(v)}
                  placeholder="Adicionar task…"
                  options={[
                    { value: '', label: 'Adicionar task…' },
                    ...remainingTasks.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                  disabled={remainingTasks.length === 0}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addManual('proximas')}
              >
                <Plus className="size-4" />
                Linha manual
              </Button>
            </div>
          </section>
        </div>

        {/* ---------- Painel lateral: sessões ---------- */}
        <aside className="flex flex-col gap-2 lg:sticky lg:top-4 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-3">
            <h3 className="text-sm font-semibold">Sessões do intervalo</h3>
            <p className="text-[11px] text-muted-foreground">
              Clique numa justificativa e depois em “inserir” para trazer a nota.
            </p>
          </div>
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
            {candidates.sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                Nenhuma sessão no intervalo.
              </p>
            ) : (
              candidates.sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(s.startedAt)}
                    </span>
                  </div>
                  {s.tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.tasks.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 truncate rounded-full bg-secondary px-1.5 py-0.5 text-[10px]"
                          style={
                            t.color
                              ? { background: `${t.color}1f`, color: t.color }
                              : undefined
                          }
                        >
                          {t.color && (
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ background: t.color }}
                            />
                          )}
                          <span
                            className={t.color ? '' : 'text-muted-foreground'}
                          >
                            {t.title}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-xs">
                    {s.notes || (
                      <span className="italic text-muted-foreground">(sem notas)</span>
                    )}
                  </p>
                  {s.notes && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => insertNote(s.notes)}
                      >
                        <CornerDownLeft className="size-3.5" />
                        Inserir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyNote(s.notes)}
                      >
                        <ClipboardCopy className="size-3.5" />
                        Copiar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <TaskPreviewDialog
        task={preview}
        sessions={candidates.sessions}
        open={preview !== null}
        onOpenChange={(o) => !o && setPreview(null)}
      />
    </div>
  );
}

// Card de uma linha editável (realizadas ou próximas)
function RowCard({
  row,
  showPercent,
  included,
  onToggleInclude,
  group,
  focused,
  onFocusJustificativa,
  onOpenTask,
  onChange,
  onRemove,
}: {
  row: ReportRow;
  showPercent?: boolean;
  included?: boolean;
  onToggleInclude?: () => void;
  group?: { name: string; color: string } | null;
  focused: boolean;
  onFocusJustificativa: () => void;
  onOpenTask?: () => void;
  onChange: (patch: Partial<ReportRow>) => void;
  onRemove: () => void;
}) {
  const dimmed = included === false;
  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-3 pl-4 transition-colors',
        focused ? 'border-primary/60' : 'border-border',
        dimmed && 'opacity-50',
      )}
    >
      {/* Faixa lateral na cor do grupo (mesmo padrão da aba de Tasks) */}
      {group?.color && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: group.color }}
        />
      )}
      <div className="flex items-center gap-2">
        {onToggleInclude && (
          <input
            type="checkbox"
            checked={included}
            onChange={onToggleInclude}
            className="size-4 accent-primary"
            title="Incluir no relatório"
          />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {row.taskId ? (
            <button
              type="button"
              onClick={onOpenTask}
              className="truncate text-left text-sm font-medium hover:text-primary hover:underline cursor-pointer"
              title="Ver detalhes da task"
            >
              {row.tarefa}
            </button>
          ) : (
            <Input
              value={row.tarefa}
              onChange={(e) => onChange({ tarefa: e.target.value })}
              placeholder="Tarefa (linha manual)"
              className="h-8 flex-1"
            />
          )}
          {group && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: `${group.color}1f`, color: group.color }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: group.color }}
              />
              {group.name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remover linha"
          className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select
            value={row.status}
            onValueChange={(v) => onChange({ status: v })}
            options={STATUS_OPTIONS}
            className="h-8"
          />
        </div>
        {showPercent && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">%</span>
            <NumberInput
              value={String(row.percent ?? 0)}
              onValueChange={(v) => onChange({ percent: v === '' ? 0 : Number(v) })}
              min={0}
              max={100}
              className="h-8 w-20"
            />
          </div>
        )}
      </div>

      <Textarea
        value={row.justificativa}
        onChange={(e) => onChange({ justificativa: e.target.value })}
        onFocus={onFocusJustificativa}
        rows={2}
        placeholder="Justificativa (só no relatório — não altera a task)"
      />
    </div>
  );
}

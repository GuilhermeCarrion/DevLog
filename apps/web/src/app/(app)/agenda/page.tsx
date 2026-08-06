'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Timer,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AgendaItemDialog } from '@/components/agenda/agenda-item-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  useAgendaMonth,
  useDeleteAgendaItem,
  useUpdateAgendaItem,
} from '@/hooks/use-agenda';
import { useProjects } from '@/hooks/use-projects';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { AgendaItem, AgendaItemType } from '@/lib/types';
import { cn } from '@/lib/utils';

export const TYPE_META: Record<
  AgendaItemType,
  { label: string; dot: string; badge: 'destructive' | 'default' | 'info' | 'secondary' }
> = {
  PRAZO: { label: 'Prazo', dot: 'bg-red-400', badge: 'destructive' },
  ENTREGA: { label: 'Entrega', dot: 'bg-lime-400', badge: 'default' },
  LEMBRETE: { label: 'Lembrete', dot: 'bg-sky-400', badge: 'info' },
  ANOTACAO: { label: 'Anotação', dot: 'bg-zinc-400', badge: 'secondary' },
};

// Agenda — módulo independente. Mostra itens de agenda (pessoais ou de
// projeto) + sessões planejadas dos projetos, num calendário mensal próprio.
export default function AgendaPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [filter, setFilter] = useState(''); // '' todos | 'pessoal' | projectId
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);

  const month = format(cursor, 'yyyy-MM');
  const { data, isLoading } = useAgendaMonth(month);
  const { data: projects } = useProjects();
  const updateItem = useUpdateAgendaItem();
  const deleteItem = useDeleteAgendaItem();

  // Grade do calendário: semanas completas cobrindo o mês (dom→sáb)
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!filter) return all;
    if (filter === 'pessoal') return all.filter((i) => !i.projectId);
    return all.filter((i) => i.projectId === filter);
  }, [data, filter]);

  const plannedSessions = useMemo(() => {
    const all = data?.plannedSessions ?? [];
    if (!filter || filter === 'pessoal') return filter ? [] : all;
    return all.filter((s) => s.projectId === filter);
  }, [data, filter]);

  // Sessões executadas (startedAt no mês) — a "camada heatmap" do que foi feito
  const doneSessions = useMemo(() => {
    const all = data?.sessions ?? [];
    if (!filter || filter === 'pessoal') return filter ? [] : all;
    return all.filter((s) => s.projectId === filter);
  }, [data, filter]);

  const dayItems = items.filter((i) => isSameDay(new Date(i.date), selectedDay));
  const daySessions = plannedSessions.filter(
    (s) => s.plannedFor && isSameDay(new Date(s.plannedFor), selectedDay),
  );
  const dayDoneSessions = doneSessions.filter(
    (s) => s.startedAt && isSameDay(new Date(s.startedAt), selectedDay),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Prazos, entregas, lembretes — com ou sem projeto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={setFilter}
            className="w-40"
            options={[
              { value: '', label: 'Tudo' },
              { value: 'pessoal', label: 'Só pessoais' },
              ...(projects ?? [])
                .filter((p) => !p.archived)
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendário */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium capitalize">
              {format(cursor, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor((c) => addMonths(c, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCursor(new Date());
                  setSelectedDay(new Date());
                }}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor((c) => addMonths(c, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-7 border-b border-border">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const selected = isSameDay(day, selectedDay);
                const dayItemsAll = items.filter((i) =>
                  isSameDay(new Date(i.date), day),
                );
                const hasSession = plannedSessions.some(
                  (s) => s.plannedFor && isSameDay(new Date(s.plannedFor), day),
                );
                // Sessões executadas no dia → intensidade estilo heatmap
                const doneCount = doneSessions.filter(
                  (s) => s.startedAt && isSameDay(new Date(s.startedAt), day),
                ).length;
                const heat =
                  doneCount >= 3
                    ? 'bg-primary/25'
                    : doneCount === 2
                      ? 'bg-primary/15'
                      : doneCount === 1
                        ? 'bg-primary/8'
                        : '';
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    title={doneCount ? `${doneCount} sessão(ões) neste dia` : undefined}
                    className={cn(
                      'flex min-h-20 flex-col items-start gap-1 border-b border-r border-border/60 p-1.5 text-left transition-colors last:border-r-0 cursor-pointer',
                      inMonth ? 'hover:bg-accent/60' : 'bg-background/40 text-muted-foreground/50',
                      inMonth && heat,
                      selected && 'bg-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs',
                        isToday(day) &&
                          'bg-primary font-semibold text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doneCount > 0 && (
                        <span
                          title={`${doneCount} sessão(ões) feita(s)`}
                          className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1 text-[9px] font-medium leading-tight text-primary"
                        >
                          {doneCount}×
                        </span>
                      )}
                      {hasSession && (
                        <span
                          title="Sessão planejada"
                          className="size-1.5 rounded-full bg-primary ring-2 ring-primary/30"
                        />
                      )}
                      {dayItemsAll.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          title={item.title}
                          className={cn(
                            'size-1.5 rounded-full',
                            TYPE_META[item.type].dot,
                            item.done && 'opacity-30',
                          )}
                        />
                      ))}
                      {dayItemsAll.length > 4 && (
                        <span className="text-[10px] leading-none text-muted-foreground">
                          +{dayItemsAll.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary/20 px-1 text-[9px] font-medium text-primary">
                n×
              </span>{' '}
              sessões feitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> sessão planejada
            </span>
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', meta.dot)} />
                {meta.label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Painel do dia */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium capitalize">
              {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              title="Adicionar neste dia"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}

          {!isLoading &&
            !dayItems.length &&
            !daySessions.length &&
            !dayDoneSessions.length && (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nada marcado para este dia.
              </p>
            )}

          {/* Sessões executadas neste dia (o que foi feito) */}
          {dayDoneSessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/20">
                  <Timer className="size-3 text-primary" />
                </span>
                Sessão — {s.project.name}
                {s.endedAt && (
                  <span className="ml-auto font-mono text-xs text-primary/80">
                    {formatDuration(s.startedAt!, s.endedAt)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {s.startedAt && formatDateTime(s.startedAt)}
                {!s.endedAt && ' · em andamento'}
              </span>
              {s.tasks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.tasks.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]"
                      style={
                        t.group?.color
                          ? {
                              background: `${t.group.color}18`,
                              borderColor: `${t.group.color}55`,
                              color: t.group.color,
                            }
                          : undefined
                      }
                    >
                      {t.group?.color && (
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: t.group.color }}
                        />
                      )}
                      {t.title}
                    </span>
                  ))}
                </div>
              )}
              {s.notes && (
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {s.notes}
                </p>
              )}
            </div>
          ))}

          {daySessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 p-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="size-4 text-primary" />
                Sessão planejada — {s.project.name}
              </div>
              {s.plannedFor && (
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(s.plannedFor)}
                </span>
              )}
              {s.notes && (
                <p className="text-xs text-muted-foreground">{s.notes}</p>
              )}
            </div>
          ))}

          {dayItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  title="Concluído"
                  onChange={() =>
                    updateItem.mutate(
                      { id: item.id, done: !item.done },
                      { onError: (e) => toast.error(e.message) },
                    )
                  }
                  className="mt-0.5 accent-[#a3e635]"
                />
                <button
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  onClick={() => {
                    setEditing(item);
                    setDialogOpen(true);
                  }}
                >
                  <p
                    className={cn(
                      'text-sm font-medium',
                      item.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </button>
                <button
                  title="Excluir"
                  className="text-muted-foreground/60 transition-colors hover:text-destructive cursor-pointer"
                  onClick={() =>
                    deleteItem.mutate(item.id, {
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={TYPE_META[item.type].badge}>
                  {TYPE_META[item.type].label}
                </Badge>
                {item.project ? (
                  <Badge variant="outline">{item.project.name}</Badge>
                ) : (
                  <Badge variant="outline">pessoal</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AgendaItemDialog
        item={editing}
        defaultDate={selectedDay}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

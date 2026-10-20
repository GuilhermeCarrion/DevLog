"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Briefcase,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Repeat,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InstallmentDialog } from "@/components/wallet/installment-dialog";
import { InstallmentSimulator } from "@/components/wallet/installment-simulator";
import { QuickAdd } from "@/components/wallet/quick-add";
import { RecurringDialog } from "@/components/wallet/recurring-dialog";
import { SavingsBoxDialog } from "@/components/wallet/savings-box-dialog";
import { SavingsEntryDialog } from "@/components/wallet/savings-entry-dialog";
import { TransactionDialog } from "@/components/wallet/transaction-dialog";
import { WalletCategoryDialog } from "@/components/wallet/wallet-category-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useDeleteInstallment,
  useDeleteRecurring,
  useDeleteSavingsEntry,
  useDeleteTransaction,
  useInstallments,
  useRecurringRules,
  useSavingsBoxes,
  useTogglePaid,
  useTransactions,
  useWalletCategories,
  useWalletSummary,
} from "@/hooks/use-wallet";
import { formatBRL } from "@/lib/calc";
import type {
  InstallmentPlan,
  RecurringRule,
  SavingsBox,
  SavingsEntry,
  WalletCategory,
  WalletSummary,
  WalletTransaction,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const INCOME_COLOR = "#a3e635";
const EXPENSE_COLOR = "#f472b6";
const PENDING_COLOR = "#fbbf24";
const NO_CAT_COLOR = "#9aa0aa";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

type ManageTab = "recorrentes" | "parcelas" | "caixinhas" | "categorias";

// Carteira — "mês em foco": quanto entra, quanto sai e quanto sobra no mês;
// lançar é uma linha; a lista separa o que falta pagar do que já foi.
export default function CarteiraPage() {
  const [month, setMonth] = useState(currentMonth());
  const [simOpen, setSimOpen] = useState(false);
  const [manage, setManage] = useState<ManageTab>("recorrentes");
  const { data: summary } = useWalletSummary(month);

  const [txDialog, setTxDialog] = useState<{
    open: boolean;
    tx: WalletTransaction | null;
  }>({ open: false, tx: null });
  const [recurringDialog, setRecurringDialog] = useState<{
    open: boolean;
    rule: RecurringRule | null;
  }>({ open: false, rule: null });
  const [installmentDialog, setInstallmentDialog] = useState<{
    open: boolean;
    plan: InstallmentPlan | null;
  }>({ open: false, plan: null });
  const [catDialog, setCatDialog] = useState<{
    open: boolean;
    cat: WalletCategory | null;
  }>({ open: false, cat: null });
  const [boxDialog, setBoxDialog] = useState<{
    open: boolean;
    box: SavingsBox | null;
  }>({ open: false, box: null });
  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    box: SavingsBox | null;
    entry: SavingsEntry | null;
  }>({ open: false, box: null, entry: null });

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho + navegação de mês */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
        <div className="flex h-9 items-center rounded-md border border-border">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="rounded-l-md p-2 text-muted-foreground hover:bg-accent cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setMonth(currentMonth())}
            title="Voltar para o mês atual"
            className="min-w-40 px-2 text-center text-sm font-medium capitalize cursor-pointer"
          >
            {monthLabel(month)}
          </button>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="rounded-r-md p-2 text-muted-foreground hover:bg-accent cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <MonthOverview summary={summary} />

      {/* Lançar (linha única) + simulador de parcela */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <QuickAdd key={month} month={month} />
        <button
          onClick={() => setSimOpen((o) => !o)}
          className="flex items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <Calculator className="size-3.5" />
          Simular parcela
          <ChevronDown
            className={cn("size-3.5 transition-transform", simOpen && "rotate-180")}
          />
        </button>
        {simOpen && (
          <div className="border-t border-border/60 pt-4">
            <InstallmentSimulator
              key={month}
              month={month}
              onDone={() => setSimOpen(false)}
            />
          </div>
        )}
      </section>

      <MonthList month={month} onEdit={(tx) => setTxDialog({ open: true, tx })} />

      {/* Gerenciar: cadastros que alimentam os meses */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gerenciar
          </h2>
          <div className="flex gap-1">
            {(
              [
                ["recorrentes", "Recorrentes"],
                ["parcelas", "Parcelas"],
                ["caixinhas", "Caixinhas"],
                ["categorias", "Categorias"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setManage(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  manage === key
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {manage === "recorrentes" && (
          <RecorrentesTab
            onNew={() => setRecurringDialog({ open: true, rule: null })}
            onEdit={(rule) => setRecurringDialog({ open: true, rule })}
          />
        )}
        {manage === "parcelas" && (
          <ParcelasTab
            onNew={() => setInstallmentDialog({ open: true, plan: null })}
            onEdit={(plan) => setInstallmentDialog({ open: true, plan })}
          />
        )}
        {manage === "caixinhas" && (
          <CaixinhasTab
            onNewBox={() => setBoxDialog({ open: true, box: null })}
            onEditBox={(box) => setBoxDialog({ open: true, box })}
            onAddEntry={(box) => setEntryDialog({ open: true, box, entry: null })}
            onEditEntry={(box, entry) => setEntryDialog({ open: true, box, entry })}
          />
        )}
        {manage === "categorias" && (
          <CategoriasTab
            onNew={() => setCatDialog({ open: true, cat: null })}
            onEdit={(cat) => setCatDialog({ open: true, cat })}
          />
        )}
      </section>

      {/* Diálogos */}
      <TransactionDialog
        transaction={txDialog.tx}
        defaultDate={`${month}-15`}
        open={txDialog.open}
        onOpenChange={(open) => setTxDialog((s) => ({ ...s, open }))}
      />
      <RecurringDialog
        rule={recurringDialog.rule}
        open={recurringDialog.open}
        onOpenChange={(open) => setRecurringDialog((s) => ({ ...s, open }))}
      />
      <InstallmentDialog
        plan={installmentDialog.plan}
        open={installmentDialog.open}
        onOpenChange={(open) => setInstallmentDialog((s) => ({ ...s, open }))}
      />
      <WalletCategoryDialog
        category={catDialog.cat}
        open={catDialog.open}
        onOpenChange={(open) => setCatDialog((s) => ({ ...s, open }))}
      />
      <SavingsBoxDialog
        box={boxDialog.box}
        open={boxDialog.open}
        onOpenChange={(open) => setBoxDialog((s) => ({ ...s, open }))}
      />
      <SavingsEntryDialog
        box={entryDialog.box}
        entry={entryDialog.entry}
        open={entryDialog.open}
        onOpenChange={(open) => setEntryDialog((s) => ({ ...s, open }))}
      />
    </div>
  );
}

// ---------------- Resumo do mês ----------------

// Entra / Sai previsto / Sobra + barra do quanto da entrada já está
// comprometido, segmentada pela cor das categorias de gasto.
function MonthOverview({ summary }: { summary: WalletSummary | undefined }) {
  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const sobra = summary?.saldoPrevisto ?? 0;
  const base = Math.max(income, expense);
  const pct = income > 0 ? Math.round((expense / income) * 100) : null;
  const cats = summary?.expenseByCategory ?? [];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Entra"
          value={summary ? formatBRL(income) : "—"}
          hint={summary ? `${formatBRL(summary.incomePaid)} recebido` : ""}
          color={INCOME_COLOR}
        />
        <Stat
          label="Sai previsto"
          value={summary ? formatBRL(expense) : "—"}
          hint={summary ? `${formatBRL(summary.pending.expense)} ainda a pagar` : ""}
          color={EXPENSE_COLOR}
        />
        <Stat
          label="Sobra"
          value={summary ? formatBRL(sobra) : "—"}
          hint={summary ? `acumulado ${formatBRL(summary.totalBalance)}` : ""}
          color={sobra < 0 ? EXPENSE_COLOR : undefined}
          strong
        />
      </div>

      {base > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary">
            {cats.map((c) => (
              <div
                key={c.name}
                className="h-full"
                style={{ width: `${(c.total / base) * 100}%`, background: c.color }}
                title={`${c.name}: ${formatBRL(c.total)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className={cn(pct !== null && pct > 100 && "text-rose-300")}>
              {pct === null ? "sem entradas no mês" : `${pct}% da entrada comprometido`}
            </span>
            {cats.slice(0, 5).map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-medium"
                style={{ background: `${c.color}1f`, borderColor: `${c.color}55`, color: c.color }}
              >
                <span className="size-1.5 rounded-full" style={{ background: c.color }} />
                {c.name} <span className="font-mono">{formatBRL(c.total)}</span>
              </span>
            ))}
            {cats.length > 5 && <span>+{cats.length - 5}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  color,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-mono text-xl font-semibold sm:text-2xl",
          strong && !color && "text-primary",
        )}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// Categoria em pill tingida com a própria cor
function CategoryPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="hidden shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium sm:inline-flex"
      style={{ background: `${color}1f`, borderColor: `${color}55`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

// ---------------- Lista do mês ----------------

function MonthList({
  month,
  onEdit,
}: {
  month: string;
  onEdit: (tx: WalletTransaction) => void;
}) {
  const { data: txs, isLoading } = useTransactions(month);
  const byDate = (a: WalletTransaction, b: WalletTransaction) =>
    a.date.localeCompare(b.date);
  const pending = (txs ?? []).filter((t) => !t.paid).sort(byDate);
  const done = (txs ?? []).filter((t) => t.paid).sort(byDate);

  if (isLoading) return null;
  if (!txs?.length) {
    return (
      <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Nenhum lançamento em {monthLabel(month)}. Use a barra acima.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {pending.length > 0 && (
        <TxGroup
          title="A pagar / receber"
          txs={pending}
          onEdit={onEdit}
          accent={PENDING_COLOR}
        />
      )}
      {done.length > 0 && (
        <TxGroup
          title="Pago / recebido"
          txs={done}
          onEdit={onEdit}
          accent={INCOME_COLOR}
          muted
        />
      )}
    </div>
  );
}

function TxGroup({
  title,
  txs,
  onEdit,
  muted,
  accent,
}: {
  title: string;
  txs: WalletTransaction[];
  onEdit: (tx: WalletTransaction) => void;
  muted?: boolean;
  accent: string;
}) {
  const out = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
  const inc = txs.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
  const net = inc - out;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <span
          className="size-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
        />
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <span className="rounded-full bg-background/70 px-1.5 text-[10px] font-medium text-muted-foreground">
          {txs.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {txs.map((t) => (
          <TxRow key={t.id} tx={t} onEdit={onEdit} muted={muted} />
        ))}
      </div>
      {/* Totalizador do grupo */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t border-border bg-secondary/40 px-3 py-2 font-mono text-xs">
        <span className="mr-auto font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Total
        </span>
        {inc > 0 && <span style={{ color: INCOME_COLOR }}>+{formatBRL(inc)}</span>}
        {out > 0 && <span style={{ color: EXPENSE_COLOR }}>−{formatBRL(out)}</span>}
        {inc > 0 && out > 0 && (
          <span
            className="font-semibold"
            style={{ color: net < 0 ? EXPENSE_COLOR : INCOME_COLOR }}
          >
            = {formatBRL(net)}
          </span>
        )}
      </div>
    </section>
  );
}

function TxRow({
  tx: t,
  onEdit,
  muted,
}: {
  tx: WalletTransaction;
  onEdit: (tx: WalletTransaction) => void;
  muted?: boolean;
}) {
  const togglePaid = useTogglePaid();
  const del = useDeleteTransaction();
  const confirm = useConfirm();
  const income = t.type === "INCOME";
  const OriginIcon =
    t.origin === "RECURRING"
      ? Repeat
      : t.origin === "INSTALLMENT"
        ? CreditCard
        : t.origin === "PROJECT"
          ? Briefcase
          : null;

  return (
    <div className="group relative flex items-center gap-3 py-2 pr-3 pl-4">
      {/* Faixa lateral na cor da categoria (mesmo padrão das tasks) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: t.category?.color ?? `${NO_CAT_COLOR}55` }}
      />
      <button
        onClick={() =>
          togglePaid.mutate(t.id, { onError: (e) => toast.error(e.message) })
        }
        title={t.paid ? "Marcar como pendente" : "Marcar como pago"}
        className={cn(
          "size-4 shrink-0 rounded-full border-2 transition-colors cursor-pointer",
          t.paid
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      />
      <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
        {format(new Date(t.date), "dd")}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("truncate text-sm", muted && "text-muted-foreground")}>
          {t.description}
        </span>
        {OriginIcon && <OriginIcon className="size-3 shrink-0 text-muted-foreground/60" />}
        {t.category && (
          <CategoryPill name={t.category.name} color={t.category.color} />
        )}
      </div>
      <span
        className={cn("shrink-0 font-mono text-sm", muted && "opacity-70")}
        style={{ color: income ? INCOME_COLOR : EXPENSE_COLOR }}
      >
        {income ? "+" : "−"}
        {formatBRL(t.amount)}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(t)}
          title="Editar"
          className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={async () => {
            const ok = await confirm({
              title: "Excluir lançamento",
              description: `Excluir "${t.description}"?`,
              confirmLabel: "Excluir",
              destructive: true,
            });
            if (ok) del.mutate(t.id, { onError: (e) => toast.error(e.message) });
          }}
          title="Excluir"
          className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------- Recorrentes ----------------

function RecorrentesTab({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (r: RecurringRule) => void;
}) {
  const { data: rules } = useRecurringRules();
  const del = useDeleteRecurring();
  const confirm = useConfirm();

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="self-start" onClick={onNew}>
        <Repeat className="size-4" />
        Nova recorrência
      </Button>
      {!rules?.length ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma recorrência.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card">
          {rules.map((r) => (
            <div
              key={r.id}
              onClick={() => onEdit(r)}
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40"
            >
              {r.category && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: r.category.color }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{r.description}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.interval === "MONTHLY"
                    ? "mensal"
                    : r.interval === "WEEKLY"
                      ? "semanal"
                      : "anual"}
                  {r.dayOfMonth ? ` · dia ${r.dayOfMonth}` : ""}
                  {!r.active ? " · pausada" : ""}
                </p>
              </div>
              <span
                className="shrink-0 font-mono text-sm"
                style={{
                  color: r.type === "INCOME" ? INCOME_COLOR : EXPENSE_COLOR,
                }}
              >
                {formatBRL(r.amount)}
              </span>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({
                    title: "Excluir recorrência",
                    description: "Excluir esta recorrência?",
                    confirmLabel: "Continuar",
                    destructive: true,
                  });
                  if (!ok) return;
                  const keep = await confirm({
                    title: "Lançamentos já gerados",
                    description:
                      "Manter os lançamentos que já foram gerados desta recorrência?",
                    confirmLabel: "Manter",
                    cancelLabel: "Apagar também",
                  });
                  del.mutate(
                    { id: r.id, keep },
                    { onError: (e) => toast.error(e.message) },
                  );
                }}
                title="Excluir recorrência"
                className="shrink-0 rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Parcelas ----------------

function ParcelasTab({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (p: InstallmentPlan) => void;
}) {
  const { data: plans } = useInstallments();
  const del = useDeleteInstallment();
  const confirm = useConfirm();

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="self-start" onClick={onNew}>
        <CreditCard className="size-4" />
        Novo parcelamento
      </Button>
      {!plans?.length ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma compra parcelada.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {plans.map((p) => {
            const paid = p.transactions.filter((t) => t.paid).length;
            return (
              <div
                key={p.id}
                onClick={() => onEdit(p)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
              >
                {p.category && (
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: p.category.color }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.description}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.installmentsCount}× · {paid}/{p.installmentsCount} pagas
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm">
                  {formatBRL(p.totalAmount)}
                </span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await confirm({
                      title: "Excluir parcelamento",
                      description:
                        "Excluir o parcelamento e todas as suas parcelas?",
                      confirmLabel: "Excluir",
                      destructive: true,
                    });
                    if (!ok) return;
                    del.mutate(p.id, {
                      onError: (e) => toast.error(e.message),
                    });
                  }}
                  title="Excluir"
                  className="shrink-0 rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Caixinhas (reserva) ----------------

function CaixinhasTab({
  onNewBox,
  onEditBox,
  onAddEntry,
  onEditEntry,
}: {
  onNewBox: () => void;
  onEditBox: (b: SavingsBox) => void;
  onAddEntry: (b: SavingsBox) => void;
  onEditEntry: (b: SavingsBox, e: SavingsEntry) => void;
}) {
  const { data: boxes } = useSavingsBoxes();
  const delEntry = useDeleteSavingsEntry();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState<string | null>(null);

  const total = (boxes ?? []).reduce((a, b) => a + b.balance, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onNewBox}>
          <PiggyBank className="size-4" />
          Nova caixinha
        </Button>
        {!!boxes?.length && (
          <span className="text-sm text-muted-foreground">
            Total guardado:{" "}
            <span className="font-mono font-semibold text-primary">
              {formatBRL(total)}
            </span>
          </span>
        )}
      </div>

      {!boxes?.length ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma caixinha. Crie uma reserva e registre seus aportes.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {boxes.map((b) => {
            const open = expanded === b.id;
            return (
              <div
                key={b.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => setExpanded(open ? null : b.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    title={open ? "Recolher" : "Ver histórico"}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: b.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.entries.length}{" "}
                        {b.entries.length === 1 ? "lançamento" : "lançamentos"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-base font-semibold text-primary">
                      {formatBRL(b.balance)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" onClick={() => onAddEntry(b)}>
                      <Plus className="size-3.5" />
                      Lançar
                    </Button>
                    <button
                      onClick={() => onEditBox(b)}
                      title="Editar caixinha"
                      className="rounded p-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border/60">
                    {!b.entries.length ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Nenhum lançamento ainda.
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y divide-border/40">
                        {b.entries.map((e) => {
                          const out = e.amount < 0;
                          return (
                            <div
                              key={e.id}
                              className="group flex items-center gap-3 px-3 py-2 pl-6"
                            >
                              <span
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                                  out
                                    ? "bg-rose-400/15 text-rose-300"
                                    : "bg-primary/15 text-primary",
                                )}
                              >
                                {out ? (
                                  <Minus className="size-3.5" />
                                ) : (
                                  <Plus className="size-3.5" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">
                                  {e.description || (out ? "Retirada" : "Aporte")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(e.date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                              <span
                                className="shrink-0 font-mono text-sm"
                                style={{
                                  color: out ? EXPENSE_COLOR : INCOME_COLOR,
                                }}
                              >
                                {out ? "−" : "+"}
                                {formatBRL(Math.abs(e.amount))}
                              </span>
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => onEditEntry(b, e)}
                                  title="Editar"
                                  className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground cursor-pointer"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const ok = await confirm({
                                      title: "Excluir lançamento",
                                      description:
                                        "Excluir este lançamento da caixinha?",
                                      confirmLabel: "Excluir",
                                      destructive: true,
                                    });
                                    if (!ok) return;
                                    delEntry.mutate(e.id, {
                                      onError: (er) => toast.error(er.message),
                                    });
                                  }}
                                  title="Excluir"
                                  className="rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Categorias ----------------

function CategoriasTab({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (c: WalletCategory) => void;
}) {
  const { data: categories } = useWalletCategories();
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="self-start" onClick={onNew}>
        <TagIcon className="size-4" />
        Nova categoria
      </Button>
      {!categories?.length ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma categoria.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onEdit(c)}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:brightness-125 cursor-pointer"
              style={{
                background: `${c.color}1f`,
                borderColor: `${c.color}55`,
                color: c.color,
              }}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: c.color, boxShadow: `0 0 0 3px ${c.color}33` }}
              />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

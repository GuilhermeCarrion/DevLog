"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
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
import { BalanceCard } from "@/components/wallet/balance-card";
import { ExpenseChart } from "@/components/wallet/expense-chart";
import { InstallmentDialog } from "@/components/wallet/installment-dialog";
import { RecurringDialog } from "@/components/wallet/recurring-dialog";
import { SavingsBoxDialog } from "@/components/wallet/savings-box-dialog";
import { SavingsEntryDialog } from "@/components/wallet/savings-entry-dialog";
import { TransactionDialog } from "@/components/wallet/transaction-dialog";
import { WalletCategoryDialog } from "@/components/wallet/wallet-category-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
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
  TxType,
  WalletCategory,
  WalletTransaction,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const INCOME_COLOR = "#a3e635";
const EXPENSE_COLOR = "#f472b6";

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

type Tab =
  | "lancamentos"
  | "recorrentes"
  | "parcelas"
  | "caixinhas"
  | "categorias";

export default function CarteiraPage() {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<Tab>("lancamentos");
  const { data: summary } = useWalletSummary(month);

  const [txDialog, setTxDialog] = useState<{
    open: boolean;
    tx: WalletTransaction | null;
  }>({
    open: false,
    tx: null,
  });
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
  }>({
    open: false,
    cat: null,
  });
  const [boxDialog, setBoxDialog] = useState<{
    open: boolean;
    box: SavingsBox | null;
  }>({ open: false, box: null });
  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    box: SavingsBox | null;
    entry: SavingsEntry | null;
  }>({ open: false, box: null, entry: null });

  const defaultDate = `${month}-15`;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho + navegação de mês */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
          <p className="text-sm text-muted-foreground">
            Controle de ganhos, gastos, recorrentes e parcelas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border h-9.5">
            <button
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-l-md p-2 text-muted-foreground hover:bg-accent cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">
              {monthLabel(month)}
            </span>
            <button
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="rounded-r-md p-2 text-muted-foreground hover:bg-accent cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <Button onClick={() => setTxDialog({ open: true, tx: null })}>
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        </div>
      </div>

      {/* Cartão de saldo (tamanho de cartão) + gráfico ocupando o resto */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="w-full shrink-0 sm:max-w-[26rem] lg:w-[26rem]">
          <BalanceCard value={summary?.totalBalance} />
        </div>
        <div className="min-w-0 flex-1">
          <ExpenseChart data={summary?.expenseByCategory ?? []} />
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Saldo (realizado)"
          value={summary ? formatBRL(summary.saldoRealizado) : "—"}
          hint={summary ? `previsto ${formatBRL(summary.saldoPrevisto)}` : ""}
          accent
        />
        <SummaryCard
          label="Entradas"
          value={summary ? formatBRL(summary.income) : "—"}
          hint={summary ? `${formatBRL(summary.incomePaid)} recebidas` : ""}
          color={INCOME_COLOR}
        />
        <SummaryCard
          label="Saídas"
          value={summary ? formatBRL(summary.expense) : "—"}
          hint={summary ? `${formatBRL(summary.expensePaid)} pagas` : ""}
          color={EXPENSE_COLOR}
        />
        <SummaryCard
          label="Pendentes"
          value={summary ? String(summary.pending.count) : "—"}
          hint={summary ? `${formatBRL(summary.pending.expense)} a pagar` : ""}
        />
      </div>

      {/* Abas */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 text-sm">
        {(
          [
            ["lancamentos", "Lançamentos"],
            ["recorrentes", "Recorrentes"],
            ["parcelas", "Parcelas"],
            ["caixinhas", "Caixinhas"],
            ["categorias", "Categorias"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer",
              tab === key
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "lancamentos" && (
        <LancamentosTab
          month={month}
          onEdit={(tx) => setTxDialog({ open: true, tx })}
        />
      )}
      {tab === "recorrentes" && (
        <RecorrentesTab
          onNew={() => setRecurringDialog({ open: true, rule: null })}
          onEdit={(rule) => setRecurringDialog({ open: true, rule })}
        />
      )}
      {tab === "parcelas" && (
        <ParcelasTab
          onNew={() => setInstallmentDialog({ open: true, plan: null })}
          onEdit={(plan) => setInstallmentDialog({ open: true, plan })}
        />
      )}
      {tab === "caixinhas" && (
        <CaixinhasTab
          onNewBox={() => setBoxDialog({ open: true, box: null })}
          onEditBox={(box) => setBoxDialog({ open: true, box })}
          onAddEntry={(box) =>
            setEntryDialog({ open: true, box, entry: null })
          }
          onEditEntry={(box, entry) =>
            setEntryDialog({ open: true, box, entry })
          }
        />
      )}
      {tab === "categorias" && (
        <CategoriasTab
          onNew={() => setCatDialog({ open: true, cat: null })}
          onEdit={(cat) => setCatDialog({ open: true, cat })}
        />
      )}

      {/* Diálogos */}
      <TransactionDialog
        transaction={txDialog.tx}
        defaultDate={defaultDate}
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

function SummaryCard({
  label,
  value,
  hint,
  color,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-lg font-semibold",
          accent && "text-primary",
        )}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

// ---------------- Lançamentos ----------------

function LancamentosTab({
  month,
  onEdit,
}: {
  month: string;
  onEdit: (tx: WalletTransaction) => void;
}) {
  const { data: categories } = useWalletCategories();
  const [fType, setFType] = useState<TxType | "">("");
  const [fCat, setFCat] = useState("");
  const [fPaid, setFPaid] = useState("");
  const { data: txs } = useTransactions(month, {
    type: fType,
    categoryId: fCat,
    paid: fPaid,
  });
  const togglePaid = useTogglePaid();
  const del = useDeleteTransaction();
  const confirm = useConfirm();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select
            value={fType}
            onValueChange={(v) => setFType(v as TxType | "")}
            options={[
              { value: "", label: "Entradas e saídas" },
              { value: "INCOME", label: "Só entradas" },
              { value: "EXPENSE", label: "Só saídas" },
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            value={fCat}
            onValueChange={setFCat}
            options={[
              { value: "", label: "Todas as categorias" },
              ...(categories ?? []).map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color,
              })),
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            value={fPaid}
            onValueChange={setFPaid}
            options={[
              { value: "", label: "Pagos e pendentes" },
              { value: "true", label: "Só pagos" },
              { value: "false", label: "Só pendentes" },
            ]}
          />
        </div>
      </div>

      {!txs?.length ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card">
          {txs.map((t) => {
            const income = t.type === "INCOME";
            return (
              <div
                key={t.id}
                className="group flex items-center gap-3 px-3 py-2.5"
              >
                <button
                  onClick={() =>
                    togglePaid.mutate(t.id, {
                      onError: (e) => toast.error(e.message),
                    })
                  }
                  title={t.paid ? "Marcar como pendente" : "Marcar como pago"}
                  className={cn(
                    "size-4 shrink-0 rounded-full border-2 transition-colors cursor-pointer",
                    t.paid
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm">
                    {t.description}
                    {t.installmentNumber && (
                      <span className="rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">
                        parcela {t.installmentNumber}
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    {format(new Date(t.date), "dd/MM", { locale: ptBR })}
                    {t.category && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: t.category.color }}
                          />
                          {t.category.name}
                        </span>
                      </>
                    )}
                    {!t.paid && (
                      <span className="text-amber-500">· pendente</span>
                    )}
                  </p>
                </div>
                <span
                  className="shrink-0 font-mono text-sm"
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
                        description: "Excluir este lançamento?",
                        confirmLabel: "Excluir",
                        destructive: true,
                      });
                      if (!ok) return;
                      del.mutate(t.id, {
                        onError: (e) => toast.error(e.message),
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
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent cursor-pointer"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: c.color }}
              />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

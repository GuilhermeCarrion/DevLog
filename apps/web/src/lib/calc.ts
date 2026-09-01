import type { CostCategory, CostItem, CostKind } from './types';

// Cada categoria tem uma cor própria — "mais cores para informações"
export const CATEGORY_META: Record<
  CostCategory,
  { label: string; short: string; color: string }
> = {
  CUSTO: { label: 'Custo (infra/manutenção)', short: 'Custo', color: '#60a5fa' }, // azul
  OUTROS: { label: 'Outros custos', short: 'Outros', color: '#a78bfa' }, // violeta
  DEV: { label: 'Mão de obra', short: 'Dev', color: '#a3e635' }, // lima
  DESCONTO: { label: 'Desconto', short: 'Desconto', color: '#f472b6' }, // rosa
};

export const CATEGORY_ORDER: CostCategory[] = [
  'CUSTO',
  'OUTROS',
  'DEV',
  'DESCONTO',
];

export const KIND_LABEL: Record<CostKind, string> = {
  FIXED: 'Valor fixo',
  HOURLY: 'Por hora',
};

type MinimalItem = Pick<CostItem, 'category' | 'kind' | 'amount' | 'hours'>;

// Horas usadas por um item HOURLY: as informadas, ou as automáticas (sessões)
export function itemHours(item: MinimalItem, autoHours: number): number {
  if (item.kind !== 'HOURLY') return 0;
  return item.hours ?? autoHours;
}

// Subtotal de um item (HOURLY = valor/hora × horas; FIXED = valor)
export function itemSubtotal(item: MinimalItem, autoHours: number): number {
  if (item.kind === 'HOURLY') return item.amount * itemHours(item, autoHours);
  return item.amount;
}

export interface CalcResult {
  custos: number; // CUSTO
  outros: number; // OUTROS
  dev: number; // mão de obra
  desconto: number; // abatimento
  devHoras: number; // total de horas de mão de obra
  subtotal: number; // custos + outros + dev
  margemPercent: number;
  margemValor: number; // subtotal × margem%
  precoBase: number; // subtotal + margem
  precoFinal: number; // preço base − descontos
}

// Fórmula: (custos + outros + mão de obra) + margem% − descontos
export function calcTotals(
  items: MinimalItem[],
  autoHours: number,
  marginPercent: number,
): CalcResult {
  let custos = 0;
  let outros = 0;
  let dev = 0;
  let desconto = 0;
  let devHoras = 0;

  for (const item of items) {
    const sub = itemSubtotal(item, autoHours);
    if (item.category === 'CUSTO') custos += sub;
    else if (item.category === 'OUTROS') outros += sub;
    else if (item.category === 'DEV') {
      dev += sub;
      devHoras += itemHours(item, autoHours);
    } else if (item.category === 'DESCONTO') desconto += sub;
  }

  const subtotal = custos + outros + dev;
  const margemValor = subtotal * (marginPercent / 100);
  const precoBase = subtotal + margemValor;
  const precoFinal = Math.max(0, precoBase - desconto);

  return {
    custos,
    outros,
    dev,
    desconto,
    devHoras,
    subtotal,
    margemPercent: marginPercent,
    margemValor,
    precoBase,
    precoFinal,
  };
}

export function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(n) ? n : 0);
}

export interface DateRange {
  from: string | null; // ISO/data (yyyy-mm-dd) — início inclusivo
  to: string | null; // yyyy-mm-dd — fim inclusivo (dia inteiro)
}

// Uma sessão conta no período se COMEÇOU dentro do intervalo [from, to].
// `to` é inclusivo até o fim do dia (23:59:59.999).
export function sessionInRange(
  session: { startedAt: string | null },
  range?: DateRange,
): boolean {
  if (!range || (!range.from && !range.to)) return true;
  if (!session.startedAt) return false;
  const t = new Date(session.startedAt).getTime();
  if (range.from && t < new Date(`${range.from}T00:00:00`).getTime()) {
    return false;
  }
  if (range.to && t > new Date(`${range.to}T23:59:59.999`).getTime()) {
    return false;
  }
  return true;
}

// Soma das horas trabalhadas (tempo ativo, excluindo pausas) das sessões
// concluídas, em horas decimais. Opcionalmente restringe a um intervalo (por
// data de início da sessão).
export function sessionsToHours(
  sessions: {
    startedAt: string | null;
    endedAt: string | null;
    accumulatedSeconds?: number;
  }[],
  range?: DateRange,
): number {
  let secs = 0;
  for (const s of sessions) {
    if (s.startedAt && s.endedAt && sessionInRange(s, range)) {
      secs += s.accumulatedSeconds ?? 0;
    }
  }
  return secs / 3600;
}

import { describe, expect, it } from 'vitest';
import {
  calcTotals,
  formatBRL,
  itemHours,
  itemSubtotal,
  sessionInRange,
  sessionsToHours,
} from '@/lib/calc';
import type { CostCategory, CostKind } from '@/lib/types';

// Helper: monta um item mínimo (calcTotals só olha category/kind/amount/hours)
function item(
  category: CostCategory,
  kind: CostKind,
  amount: number,
  hours: number | null = null,
) {
  return { category, kind, amount, hours };
}

describe('itemHours', () => {
  it('usa as horas informadas quando existem', () => {
    expect(itemHours(item('DEV', 'HOURLY', 5, 8), 100)).toBe(8);
  });
  it('cai nas horas automáticas quando null', () => {
    expect(itemHours(item('DEV', 'HOURLY', 5, null), 12)).toBe(12);
  });
  it('é 0 para itens FIXED', () => {
    expect(itemHours(item('CUSTO', 'FIXED', 50), 12)).toBe(0);
  });
});

describe('itemSubtotal', () => {
  it('FIXED = valor', () => {
    expect(itemSubtotal(item('CUSTO', 'FIXED', 50), 10)).toBe(50);
  });
  it('HOURLY = valor/hora × horas', () => {
    expect(itemSubtotal(item('DEV', 'HOURLY', 30, 5), 99)).toBe(150);
  });
  it('HOURLY com horas null usa autoHours', () => {
    expect(itemSubtotal(item('DEV', 'HOURLY', 10, null), 4)).toBe(40);
  });
});

describe('calcTotals', () => {
  const base = [
    item('CUSTO', 'FIXED', 100),
    item('OUTROS', 'FIXED', 40),
    item('DEV', 'HOURLY', 30, 5), // 150 e 5h
  ];

  it('soma categorias e aplica a margem (exemplo Moven-TCC)', () => {
    const r = calcTotals(base, 0, 30);
    expect(r.custos).toBe(100);
    expect(r.outros).toBe(40);
    expect(r.dev).toBe(150);
    expect(r.devHoras).toBe(5);
    expect(r.subtotal).toBe(290);
    expect(r.margemValor).toBeCloseTo(87, 5);
    expect(r.precoFinal).toBeCloseTo(377, 5);
  });

  it('desconto abate do preço final', () => {
    const r = calcTotals([...base, item('DESCONTO', 'FIXED', 27)], 0, 30);
    expect(r.desconto).toBe(27);
    expect(r.precoFinal).toBeCloseTo(350, 5);
  });

  it('margem de 50% com desconto', () => {
    const r = calcTotals([...base, item('DESCONTO', 'FIXED', 27)], 0, 50);
    expect(r.precoFinal).toBeCloseTo(408, 5);
  });

  it('nunca deixa o preço final negativo', () => {
    const r = calcTotals([item('DESCONTO', 'FIXED', 500)], 0, 0);
    expect(r.precoFinal).toBe(0);
  });

  it('lista vazia → tudo zero', () => {
    const r = calcTotals([], 0, 30);
    expect(r.subtotal).toBe(0);
    expect(r.precoFinal).toBe(0);
  });
});

describe('sessionInRange', () => {
  const s = { startedAt: '2026-08-10T10:00:00' };
  it('sem range → sempre true', () => {
    expect(sessionInRange(s)).toBe(true);
    expect(sessionInRange(s, { from: null, to: null })).toBe(true);
  });
  it('dentro do intervalo', () => {
    expect(sessionInRange(s, { from: '2026-08-01', to: '2026-08-31' })).toBe(true);
  });
  it('antes do início / depois do fim', () => {
    expect(sessionInRange(s, { from: '2026-08-11', to: null })).toBe(false);
    expect(sessionInRange(s, { from: null, to: '2026-08-09' })).toBe(false);
  });
  it('to é inclusivo no dia inteiro', () => {
    expect(sessionInRange(s, { from: null, to: '2026-08-10' })).toBe(true);
  });
});

describe('sessionsToHours', () => {
  const sessions = [
    { startedAt: '2026-08-10T10:00:00', endedAt: '2026-08-10T11:00:00', accumulatedSeconds: 3600 },
    { startedAt: '2026-08-20T09:00:00', endedAt: '2026-08-20T09:30:00', accumulatedSeconds: 1800 },
    { startedAt: '2026-08-20T09:00:00', endedAt: null, accumulatedSeconds: 9999 }, // não concluída
  ];
  it('soma só as concluídas, por accumulatedSeconds', () => {
    expect(sessionsToHours(sessions)).toBeCloseTo(1.5, 5);
  });
  it('respeita o filtro de intervalo', () => {
    expect(sessionsToHours(sessions, { from: '2026-08-01', to: '2026-08-15' })).toBeCloseTo(1, 5);
  });
});

describe('formatBRL', () => {
  it('formata em reais', () => {
    expect(formatBRL(1234.5)).toContain('1.234,50');
  });
  it('valor inválido vira 0', () => {
    expect(formatBRL(NaN)).toContain('0,00');
  });
});

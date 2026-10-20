import { describe, expect, it } from 'vitest';
import { parseAmount, simulateInstallments, splitInstallments } from './wallet';

describe('parseAmount', () => {
  it('aceita formatos pt-BR e com ponto', () => {
    expect(parseAmount('120')).toBe(120);
    expect(parseAmount('120,50')).toBe(120.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('R$ 99,90')).toBe(99.9);
    expect(parseAmount('120.50')).toBe(120.5);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });
});

describe('splitInstallments', () => {
  it('soma exatamente o total, ajustando centavos na última', () => {
    expect(splitInstallments(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(splitInstallments(1200, 12).every((v) => v === 100)).toBe(true);
  });
});

describe('simulateInstallments', () => {
  it('desconta a parcela da sobra prevista de cada mês', () => {
    const r = simulateInstallments(300, 2, [
      { month: '2026-11', income: 1000, expense: 800, balance: 200 },
      { month: '2026-12', income: 1000, expense: 900, balance: 100 },
    ]);
    expect(r).toEqual([
      { month: '2026-11', installment: 150, balance: 200, after: 50 },
      { month: '2026-12', installment: 150, balance: 100, after: -50 },
    ]);
  });
});

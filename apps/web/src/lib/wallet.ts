import type { WalletForecastMonth } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

// Valor digitado → número. Aceita "120", "120,50", "1.234,56" e "120.50".
export function parseAmount(v: string): number {
  const s = v.trim().replace(/\s|R\$/g, '');
  if (!s) return NaN;
  // com vírgula = padrão pt-BR: pontos são milhar, vírgula é decimal
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
}

// Mesmo rateio do backend: parcelas iguais, centavos ajustados na última.
export function splitInstallments(total: number, count: number): number[] {
  const per = round2(total / count);
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? round2(total - per * (count - 1)) : per,
  );
}

// Para cada parcela: sobra prevista do mês antes e depois de incluí-la.
export function simulateInstallments(
  total: number,
  count: number,
  forecast: WalletForecastMonth[],
) {
  return splitInstallments(total, count).map((installment, i) => {
    const balance = forecast[i]?.balance ?? 0;
    return {
      month: forecast[i]?.month ?? '',
      installment,
      balance,
      after: round2(balance - installment),
    };
  });
}

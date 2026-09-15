import { describe, expect, it } from 'vitest';
import { defaultReportFilename } from './report';

describe('defaultReportFilename', () => {
  it('gera o padrão RAP-TDS-{ano}.{semana 3 dígitos}.docx', () => {
    expect(defaultReportFilename('13/2026')).toBe('RAP-TDS-2026.013.docx');
    expect(defaultReportFilename('1/2026')).toBe('RAP-TDS-2026.001.docx');
    expect(defaultReportFilename('20/2025')).toBe('RAP-TDS-2025.020.docx');
  });

  it('tem fallback seguro para formatos inesperados', () => {
    expect(defaultReportFilename('semana X')).toBe('relatorio-semana-X.docx');
  });
});

// Nome padrão do arquivo do relatório — mesmo formato do backend, pedido pelo
// professor: RAP-TDS-{ano}.{semana com 3 dígitos}.docx
// Ex.: semana "13/2026" → "RAP-TDS-2026.013.docx".
export function defaultReportFilename(semana: string): string {
  const m = /^(\d{1,3})\/(\d{4})$/.exec(semana.trim());
  if (m) {
    const week = String(Number(m[1])).padStart(3, '0');
    return `RAP-TDS-${m[2]}.${week}.docx`;
  }
  return `relatorio-${semana.replace(/[^\w]+/g, '-')}.docx`;
}

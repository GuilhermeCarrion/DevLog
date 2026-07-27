import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(iso: string) {
  return format(new Date(iso), "dd 'de' MMM", { locale: ptBR });
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "dd/MM 'às' HH:mm", { locale: ptBR });
}

// Tempo decorrido de sessão ativa: "1h 23m" / "45m" / "12s"
export function formatElapsed(fromIso: string, now: Date = new Date()) {
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(fromIso).getTime()) / 1000),
  );
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

// Duração de sessão encerrada
export function formatDuration(startIso: string, endIso: string) {
  return formatElapsed(startIso, new Date(endIso));
}

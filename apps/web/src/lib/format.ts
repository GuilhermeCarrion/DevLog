import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(iso: string) {
  return format(new Date(iso), "dd 'de' MMM", { locale: ptBR });
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "dd/MM 'às' HH:mm", { locale: ptBR });
}

// ISO → valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm", hora local)
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Formata uma quantidade de segundos: "1h 23m" / "45m" / "12s"
export function formatSeconds(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

// Tempo decorrido de sessão ativa: "1h 23m" / "45m" / "12s"
export function formatElapsed(fromIso: string, now: Date = new Date()) {
  return formatSeconds((now.getTime() - new Date(fromIso).getTime()) / 1000);
}

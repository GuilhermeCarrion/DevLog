import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

const STATUS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  FUTURO: 'Feature / Futuro',
};

const PRIORITY: Record<TaskPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

// Formata a task como texto legível (não-técnico) para colar no Claude ou
// compartilhar. Só inclui campos preenchidos.
export function taskToText(task: Task): string {
  const lines = [
    `Task: ${task.title}`,
    `Status: ${STATUS[task.status]} (${task.progress}%)`,
    `Prioridade: ${PRIORITY[task.priority]}`,
  ];
  if (task.group?.name) lines.push(`Grupo: ${task.group.name}`);
  if (task.description) lines.push(`\nDescrição:\n${task.description}`);
  if (task.notes) lines.push(`\nAnotações:\n${task.notes}`);
  return lines.join('\n');
}

// Copia texto para a área de transferência (com fallback para navegadores
// sem a Clipboard API disponível em contexto inseguro).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

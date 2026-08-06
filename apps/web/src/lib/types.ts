// Tipos espelhando as respostas da API (Prisma models + includes usados)

export type TaskStatus = 'BACKLOG' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'FUTURO';
export type TaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA';
export type AgendaItemType = 'PRAZO' | 'ENTREGA' | 'LEMBRETE' | 'ANOTACAO';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  archived: boolean;
  tags?: Tag[];
  _count?: { tasks: number; sessions: number; notes: number };
  groups?: Group[];
}

export interface Group {
  id: string;
  name: string;
  color: string | null;
  projectId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  notes: string | null;
  projectId: string;
  groupId: string | null;
  group: Group | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  plannedFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  commits: string | null;
  nextStep: string | null;
  tasks: {
    id: string;
    title: string;
    status?: TaskStatus;
    group?: { id: string; name: string; color: string | null } | null;
  }[];
}

// Status derivado da sessão (regra da spec — nunca persistido)
export type SessionStatus = 'planejada' | 'ativa' | 'concluida';

export function sessionStatus(s: WorkSession): SessionStatus {
  if (!s.startedAt) return 'planejada';
  if (!s.endedAt) return 'ativa';
  return 'concluida';
}

export interface Note {
  id: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  title: string;
  content: string;
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  type: AgendaItemType;
  done: boolean;
  projectId: string | null;
  project: { id: string; name: string } | null;
}

export interface AgendaMonth {
  items: AgendaItem[];
  plannedSessions: WorkSession[];
  sessions: WorkSession[]; // executadas (startedAt no mês) — visão do que foi feito
}

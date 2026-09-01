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
  marginPercent: number | null;
  tags?: Tag[];
  _count?: { tasks: number; sessions: number; notes: number };
  groups?: Group[];
}

export type CostCategory = 'CUSTO' | 'OUTROS' | 'DEV' | 'DESCONTO';
export type CostKind = 'FIXED' | 'HOURLY';

export interface CostItem {
  id: string;
  projectId: string;
  name: string;
  category: CostCategory;
  kind: CostKind;
  amount: number;
  hours: number | null;
  position: number;
  createdAt: string;
}

export interface CostTemplate {
  id: string;
  name: string;
  category: CostCategory;
  kind: CostKind;
  amount: number;
  hours: number | null;
}

export interface CalcSettings {
  defaultHourlyRate: number;
  defaultMargin: number;
}

// Categoria de período de cobrança (ex: "Pago"), reutilizável por usuário
export interface PeriodCategory {
  id: string;
  name: string;
  color: string;
}

// Lançamento de período: registro histórico de um intervalo de datas do projeto
export interface CostPeriod {
  id: string;
  projectId: string;
  categoryId: string | null;
  category: PeriodCategory | null;
  label: string | null;
  startDate: string;
  endDate: string;
  hours: number;
  amount: number;
  note: string | null;
  createdAt: string;
  items: CostItem[]; // custos arquivados neste lançamento
}

// Metadados fixos do cabeçalho do relatório (o que não vem de tasks/sessões)
export interface ReportProfile {
  id: string;
  projectId: string;
  grupoTurma: string;
  aluno: string;
  ra: string;
  curso: string;
  termo: string;
  orientador: string;
  coorientador: string | null;
  tema: string;
  area: string;
}

// Linha editável de uma tabela do relatório (realizadas / próximas)
export interface ReportRow {
  taskId?: string | null; // null = linha manual
  tarefa: string;
  status: string;
  percent?: number | null;
  justificativa: string;
}

export interface ReportCandidateTask {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  description: string | null;
  notes: string | null;
  group: { name: string; color: string } | null;
}

export interface ReportCandidateSession {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  notes: string;
  tasks: { id: string; title: string; color: string | null }[];
}

export interface ReportCandidates {
  realizadas: (ReportRow & { taskId: string })[];
  proximas: (ReportRow & { taskId: string })[];
  tasks: ReportCandidateTask[];
  sessions: ReportCandidateSession[];
  suggestedPercentTotal: number;
  suggestedSemana: string;
  suggestedData: string;
}

export interface ReportHistoryItem {
  id: string;
  week: string;
  generatedAt: string;
  percentTotal: number;
}

// Resumo agregado do usuário (tela de Configurações → Resumo)
export interface SummaryProject {
  id: string;
  name: string;
  archived: boolean;
  tasks: number;
  sessions: number;
  periods: number;
  hours: number;
  billed: number;
  progress: number;
}

export interface Summary {
  projects: number;
  activeProjects: number;
  tasks: number;
  sessions: number;
  notes: number;
  periods: number;
  totalHours: number;
  totalBilled: number;
  avgProgress: number;
  perProject: SummaryProject[];
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
  name: string | null; // nome do plano/sprint (nos templates)
  plannedFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  accumulatedSeconds: number; // tempo ativo acumulado (exclui pausas)
  runningSince: string | null; // início do segmento em andamento (null = pausada/parada)
  plannedDoneAt: string | null; // plano concluído
  parentId: string | null;
  parent: { id: string; name: string | null } | null; // plano/sprint de origem
  _count?: { children: number };
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

// Status derivado da sessão (nunca persistido)
export type SessionStatus =
  | 'plano' // template ativo (startedAt null)
  | 'plano_concluido'
  | 'ativa'
  | 'pausada'
  | 'concluida';

export function sessionStatus(s: WorkSession): SessionStatus {
  if (!s.startedAt) return s.plannedDoneAt ? 'plano_concluido' : 'plano';
  if (!s.endedAt) return s.runningSince ? 'ativa' : 'pausada';
  return 'concluida';
}

// Segundos trabalhados: acumulado + segmento em andamento (se rodando)
export function sessionElapsedSeconds(s: WorkSession, nowMs: number): number {
  let secs = s.accumulatedSeconds;
  if (s.runningSince && !s.endedAt) {
    secs += Math.max(0, Math.floor((nowMs - new Date(s.runningSince).getTime()) / 1000));
  }
  return secs;
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

import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateReportDto,
  ReportRowDto,
  UpsertReportProfileDto,
} from './dto/report.dto';

const execFileAsync = promisify(execFile);

// Item de uma das tabelas repetíveis do template (realizadas / proximas)
interface RowItem {
  tarefa: string;
  status: string;
  percent?: number | null;
  justificativa: string;
}

// Reduz uma linha (dto ou derivada) ao que o template consome
function stripRow(row: ReportRowDto | RowItem): RowItem {
  return {
    tarefa: row.tarefa,
    status: row.status,
    percent: row.percent ?? undefined,
    justificativa: row.justificativa,
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- caminhos do subprocesso Python (env com defaults) ----------

  private reportDir(): string {
    // A API roda em apps/api → a pasta report/ fica em apps/api/report
    return join(process.cwd(), 'report');
  }

  private pythonBin(): string {
    if (process.env.REPORT_PYTHON) return process.env.REPORT_PYTHON;
    const rel =
      process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python';
    return join(this.reportDir(), '.venv', rel);
  }

  private scriptPath(): string {
    return (
      process.env.REPORT_SCRIPT ?? join(this.reportDir(), 'gerar_relatorio.py')
    );
  }

  private templatePath(): string {
    return (
      process.env.REPORT_TEMPLATE_PATH ??
      join(
        this.reportDir(),
        'templates',
        'RAP-TDS-2026_013-template-docxtpl.docx',
      )
    );
  }

  // ---------- geração ----------

  async generate(userId: string, projectId: string, dto: GenerateReportDto) {
    const context = await this.buildContext(userId, projectId, dto);
    const buffer = await this.runPython(context);

    // Nome do arquivo: o que o usuário digitou (saneado) ou o padrão do professor
    const filename = dto.filename?.trim()
      ? this.sanitizeFilename(dto.filename)
      : this.defaultFilename(String(context.semana));

    // Snapshot: guarda o contexto (e o nome) pra rebaixar fiel depois
    await this.prisma.report.create({
      data: {
        projectId,
        week: String(context.semana),
        percentTotal: Number(context.percent_total) || 0,
        filename,
        contextJson: JSON.stringify(context),
      },
    });

    return { filename, buffer };
  }

  // Candidatos pré-preenchidos para a tela de revisão.
  async getCandidates(
    userId: string,
    projectId: string,
    from: string,
    to: string,
  ) {
    await this.assertProject(userId, projectId);
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

    const realizadas = await this.deriveRealizadas(projectId, start, end);
    const proximas = await this.deriveProximas(projectId, end);

    // Todas as tasks do projeto (para adicionar manualmente + preview no modal).
    // Inclui a cor do grupo para tingir as linhas na revisão.
    const rawTasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        description: true,
        notes: true,
        group: { select: { name: true, color: true } },
      },
    });
    const tasks = rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      progress: t.progress,
      description: t.description,
      notes: t.notes,
      group: t.group ? { name: t.group.name, color: t.group.color } : null,
    }));

    // Sessões executadas no intervalo (painel lateral)
    const rawSessions = await this.prisma.workSession.findMany({
      where: { projectId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        notes: true,
        tasks: {
          select: { id: true, title: true, group: { select: { color: true } } },
        },
      },
    });
    const sessions = rawSessions.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      notes: s.notes ?? '',
      tasks: s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        color: t.group?.color ?? null,
      })),
    }));

    return {
      realizadas,
      proximas,
      tasks,
      sessions,
      suggestedPercentTotal: await this.avgProgress(projectId),
      suggestedSemana: this.isoWeek(end),
      suggestedData: this.formatBR(to),
    };
  }

  // Monta o `context` exatamente com as chaves que o template espera.
  private async buildContext(
    userId: string,
    projectId: string,
    dto: GenerateReportDto,
  ) {
    const profile = await this.prisma.reportProfile.findFirst({
      where: { projectId, project: { userId } },
    });
    if (!profile) {
      throw new NotFoundException(
        'Configure os dados do relatório (ReportProfile) deste projeto antes de gerar.',
      );
    }

    const start = new Date(`${dto.from}T00:00:00`);
    const end = new Date(`${dto.to}T23:59:59.999`);

    // Usa as linhas editadas na revisão; se ausentes, deriva automaticamente
    const realizadas: RowItem[] = dto.realizadas
      ? dto.realizadas.map(stripRow)
      : (await this.deriveRealizadas(projectId, start, end)).map(stripRow);
    const proximas: RowItem[] = dto.proximas
      ? dto.proximas.map(stripRow)
      : (await this.deriveProximas(projectId, end)).map(stripRow);

    // percent_total sugerido: média de progress das tasks com status != FUTURO
    const percentTotal =
      dto.percentTotal ?? (await this.avgProgress(projectId));

    return {
      grupo_turma: profile.grupoTurma,
      aluno: profile.aluno,
      ra: profile.ra,
      curso: profile.curso,
      termo: profile.termo,
      semana: dto.semana ?? this.isoWeek(end),
      data: dto.data ?? this.formatBR(dto.to),
      percent_total: percentTotal,
      orientador: profile.orientador,
      coorientador: profile.coorientador ?? '',
      tema: profile.tema,
      area: profile.area,
      realizadas,
      proximas,
    };
  }

  // realizadas: tasks com pelo menos uma sessão executada no intervalo
  private async deriveRealizadas(projectId: string, start: Date, end: Date) {
    const feitas = await this.prisma.task.findMany({
      where: {
        projectId,
        sessions: { some: { startedAt: { gte: start, lte: end } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return feitas.map((t) => ({
      taskId: t.id,
      tarefa: t.title,
      status: t.progress >= 100 ? 'Concluída' : 'Em andamento',
      percent: t.progress,
      justificativa: t.description ?? t.notes ?? '',
    }));
  }

  // proximas: tasks de sessões planejadas (startedAt null) após o intervalo
  private async deriveProximas(projectId: string, end: Date) {
    const planejadas = await this.prisma.task.findMany({
      where: {
        projectId,
        sessions: { some: { startedAt: null, plannedFor: { gt: end } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sessions: {
          where: { startedAt: null, plannedFor: { gt: end } },
          orderBy: { plannedFor: 'asc' },
          take: 1,
        },
      },
    });
    return planejadas.map((t) => ({
      taskId: t.id,
      tarefa: t.title,
      status: 'Em espera',
      justificativa: t.sessions[0]?.notes ?? t.description ?? '',
    }));
  }

  // Nome padrão pedido pelo professor: RAP-TDS-{ano}.{semana com 3 dígitos}.docx
  // (ex.: semana "13/2026" → "RAP-TDS-2026.013.docx").
  private defaultFilename(semana: string): string {
    const m = /^(\d{1,3})\/(\d{4})$/.exec(semana.trim());
    if (m) {
      const week = String(Number(m[1])).padStart(3, '0');
      return `RAP-TDS-${m[2]}.${week}.docx`;
    }
    // Formato inesperado: cai num nome seguro sem quebrar o download
    return `relatorio-${semana.replace(/[^\w]+/g, '-')}.docx`;
  }

  // Garante um nome de arquivo seguro (sem caminho) e com extensão .docx
  private sanitizeFilename(name: string): string {
    const cleaned = name
      .trim()
      .replace(/[\\/]+/g, '-') // separadores de path viram "-"
      .replace(/[<>:"|?*]/g, '') // caracteres reservados
      // remove caracteres de controle (ASCII < 32) sem regex de control-char
      .split('')
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join('')
      .trim();
    const safe = cleaned || 'relatorio';
    return /\.docx$/i.test(safe) ? safe : `${safe}.docx`;
  }

  private async avgProgress(projectId: string): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, status: { not: 'FUTURO' } },
      select: { progress: true },
    });
    if (tasks.length === 0) return 0;
    const soma = tasks.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(soma / tasks.length);
  }

  // Roda o script Python via subprocesso, devolvendo o .docx como Buffer.
  private async runPython(context: Record<string, unknown>): Promise<Buffer> {
    const inputPath = join(tmpdir(), `devlog-report-${randomUUID()}.json`);
    const outputPath = join(tmpdir(), `devlog-report-${randomUUID()}.docx`);
    await fs.writeFile(inputPath, JSON.stringify(context), 'utf-8');
    try {
      await execFileAsync(
        this.pythonBin(),
        [
          this.scriptPath(),
          '--template',
          this.templatePath(),
          '--input',
          inputPath,
          '--output',
          outputPath,
        ],
        { cwd: this.reportDir() },
      );
      return await fs.readFile(outputPath);
    } catch (err) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr)
          : String(err);
      throw new InternalServerErrorException(
        `Falha ao gerar o relatório: ${stderr.trim() || 'erro no subprocesso Python'}`,
      );
    } finally {
      await fs.rm(inputPath, { force: true });
      await fs.rm(outputPath, { force: true });
    }
  }

  // ---------- ReportProfile (helper mínimo para o fluxo ficar testável) ----------

  async getProfile(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    return this.prisma.reportProfile.findUnique({ where: { projectId } });
  }

  async upsertProfile(
    userId: string,
    projectId: string,
    dto: UpsertReportProfileDto,
  ) {
    await this.assertProject(userId, projectId);
    const data = { ...dto, coorientador: dto.coorientador ?? null };
    return this.prisma.reportProfile.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });
  }

  // ---------- histórico (snapshots) ----------

  async listReports(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    return this.prisma.report.findMany({
      where: { projectId, project: { userId } },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, week: true, generatedAt: true, percentTotal: true },
    });
  }

  // Rebaixa um relatório do histórico re-renderizando o snapshot guardado.
  async downloadReport(userId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, project: { userId } },
    });
    if (!report) throw new NotFoundException('Relatório não encontrado');
    if (!report.contextJson) {
      throw new NotFoundException(
        'Este relatório não tem snapshot para rebaixar.',
      );
    }
    const context = JSON.parse(report.contextJson) as Record<string, unknown>;
    const buffer = await this.runPython(context);
    return {
      filename: report.filename ?? this.defaultFilename(report.week),
      buffer,
    };
  }

  // ---------- helpers ----------

  private async assertProject(userId: string, projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Projeto não encontrado');
  }

  // Formata "yyyy-mm-dd" → "dd/mm/yyyy" (sem depender de timezone)
  private formatBR(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // Número da semana ISO 8601 → "NN/AAAA"
  private isoWeek(date: Date): string {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    // quinta-feira da semana define o ano ISO
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
    );
    return `${String(week).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}

'use client';

import {
  Clock,
  FolderKanban,
  ListChecks,
  NotebookPen,
  Percent,
  Timer,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe, useUpdateMe } from '@/hooks/use-auth';
import { useSummary } from '@/hooks/use-summary';
import { formatBRL } from '@/lib/calc';
import type { SummaryProject } from '@/lib/types';

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados de conta e um resumo geral dos seus projetos.
        </p>
      </div>
      <MeusDados />
      <Resumo />
    </div>
  );
}

// ---------------- Meus dados ----------------

function MeusDados() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.name);
      setEmail(me.email);
    }
  }, [me]);

  const nameChanged = me && name.trim() !== me.name;
  const emailChanged = me && email.trim() !== me.email;
  const wantsPassword = newPassword.length > 0;
  const dirty = nameChanged || emailChanged || wantsPassword;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    if ((emailChanged || wantsPassword) && !currentPassword) {
      toast.error('Informe a senha atual para alterar email ou senha.');
      return;
    }
    updateMe.mutate(
      {
        name: nameChanged ? name.trim() : undefined,
        email: emailChanged ? email.trim() : undefined,
        currentPassword: currentPassword || undefined,
        newPassword: wantsPassword ? newPassword : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Dados atualizados!');
          setCurrentPassword('');
          setNewPassword('');
        },
        onError: (er) => toast.error(er.message),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Meus dados</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>
                Senha atual{' '}
                <span className="text-xs text-muted-foreground">
                  (para alterar email/senha)
                </span>
              </Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Nova senha{' '}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mín. 6 caracteres"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!dirty || updateMe.isPending}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------- Resumo ----------------

function Resumo() {
  const { data: s, isLoading } = useSummary();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visão geral de tudo que você registrou no DevLog.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isLoading || !s ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Stat
                icon={<FolderKanban className="size-4" />}
                label="Projetos"
                value={`${s.activeProjects}${s.projects !== s.activeProjects ? ` / ${s.projects}` : ''}`}
                hint={s.projects !== s.activeProjects ? 'ativos / total' : 'ativos'}
              />
              <Stat
                icon={<Percent className="size-4" />}
                label="Conclusão média"
                value={`${s.avgProgress}%`}
              />
              <Stat
                icon={<Wallet className="size-4" />}
                label="Total cobrado"
                value={formatBRL(s.totalBilled)}
                hint={`${s.periods} período(s)`}
              />
              <Stat
                icon={<Clock className="size-4" />}
                label="Horas registradas"
                value={`${s.totalHours.toFixed(1)}h`}
              />
              <Stat
                icon={<ListChecks className="size-4" />}
                label="Tasks"
                value={String(s.tasks)}
              />
              <Stat
                icon={<Timer className="size-4" />}
                label="Sessões"
                value={String(s.sessions)}
              />
              <Stat
                icon={<NotebookPen className="size-4" />}
                label="Anotações"
                value={String(s.notes)}
              />
            </div>

            {/* Por projeto */}
            {s.perProject.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Por projeto
                </p>
                <div className="flex flex-col divide-y divide-border/60">
                  {s.perProject.map((p) => (
                    <ProjectRow key={p.id} p={p} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/30 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-xl font-semibold">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ProjectRow({ p }: { p: SummaryProject }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {p.name}
          {p.archived && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              arquivado
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {p.tasks} task(s) · {p.sessions} sessão(ões) · {p.hours.toFixed(1)}h
          {p.billed > 0 ? ` · ${formatBRL(p.billed)}` : ''}
        </p>
      </div>
      <div className="flex w-28 shrink-0 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${p.progress}%` }}
          />
        </div>
        <span className="w-9 text-right font-mono text-xs text-muted-foreground">
          {p.progress}%
        </span>
      </div>
    </div>
  );
}

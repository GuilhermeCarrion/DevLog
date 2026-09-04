import { describe, expect, it } from 'vitest';
import {
  sessionElapsedSeconds,
  sessionStatus,
  type WorkSession,
} from '@/lib/types';

// Monta uma sessão parcial (as funções só olham alguns campos)
function s(partial: Partial<WorkSession>): WorkSession {
  return {
    accumulatedSeconds: 0,
    runningSince: null,
    startedAt: null,
    endedAt: null,
    plannedDoneAt: null,
    ...partial,
  } as WorkSession;
}

describe('sessionStatus', () => {
  it('plano (template ativo)', () => {
    expect(sessionStatus(s({ startedAt: null }))).toBe('plano');
  });
  it('plano concluído', () => {
    expect(sessionStatus(s({ startedAt: null, plannedDoneAt: '2026-08-01' }))).toBe(
      'plano_concluido',
    );
  });
  it('ativa (rodando)', () => {
    expect(
      sessionStatus(s({ startedAt: 'x', endedAt: null, runningSince: 'x' })),
    ).toBe('ativa');
  });
  it('pausada (sem segmento em andamento)', () => {
    expect(
      sessionStatus(s({ startedAt: 'x', endedAt: null, runningSince: null })),
    ).toBe('pausada');
  });
  it('concluída', () => {
    expect(sessionStatus(s({ startedAt: 'x', endedAt: 'y' }))).toBe('concluida');
  });
});

describe('sessionElapsedSeconds', () => {
  const now = new Date('2026-08-10T10:00:10').getTime();
  it('pausada = só o acumulado', () => {
    expect(sessionElapsedSeconds(s({ accumulatedSeconds: 100, runningSince: null }), now)).toBe(
      100,
    );
  });
  it('rodando = acumulado + segmento atual', () => {
    const session = s({
      accumulatedSeconds: 100,
      runningSince: '2026-08-10T10:00:00', // 10s antes de now
      endedAt: null,
    });
    expect(sessionElapsedSeconds(session, now)).toBe(110);
  });
  it('concluída não conta segmento em andamento', () => {
    const session = s({
      accumulatedSeconds: 100,
      runningSince: '2026-08-10T09:00:00',
      endedAt: '2026-08-10T09:30:00',
    });
    expect(sessionElapsedSeconds(session, now)).toBe(100);
  });
});

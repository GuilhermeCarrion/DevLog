import { describe, expect, it } from 'vitest';
import { formatSeconds } from '@/lib/format';

describe('formatSeconds', () => {
  it('horas e minutos', () => {
    expect(formatSeconds(3661)).toBe('1h 01m');
  });
  it('só minutos', () => {
    expect(formatSeconds(90)).toBe('1m');
  });
  it('só segundos', () => {
    expect(formatSeconds(45)).toBe('45s');
  });
  it('zero', () => {
    expect(formatSeconds(0)).toBe('0s');
  });
  it('negativo é tratado como 0', () => {
    expect(formatSeconds(-10)).toBe('0s');
  });
});

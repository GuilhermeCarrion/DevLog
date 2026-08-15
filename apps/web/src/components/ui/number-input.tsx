'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value' | 'type' | 'step'
  > {
  value: string;
  onValueChange: (value: string) => void;
  // Opcional: chamado ao sair do campo (commit)
  onCommit?: (value: string) => void;
  step?: number; // ignorado — mantido só por compatibilidade de props
  min?: number;
  max?: number;
}

// Campo numérico simples, sem setinhas de incremento/decremento (nem nativas
// — escondidas via .no-spinner — nem customizadas).
export function NumberInput({
  value,
  onValueChange,
  onCommit,
  step: _step,
  min: _min,
  max: _max,
  className,
  ...props
}: NumberInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      spellCheck={false}
      autoComplete="off"
      onChange={(e) => onValueChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-secondary/60 px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

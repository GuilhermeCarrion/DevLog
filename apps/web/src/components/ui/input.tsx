import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      // Defaults: sem correção ortográfica (sublinhado vermelho) nem sugestões
      // do browser. Vêm antes do spread, então cada caller pode sobrescrever.
      spellCheck={false}
      autoComplete="off"
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-secondary/60 px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

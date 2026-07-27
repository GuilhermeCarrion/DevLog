import * as React from 'react';
import { cn } from '@/lib/utils';

// Select nativo estilizado — arroz com feijão: sem lib, acessível por padrão
function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-secondary/60 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 [&>option]:bg-popover',
        className,
      )}
      {...props}
    />
  );
}

export { Select };

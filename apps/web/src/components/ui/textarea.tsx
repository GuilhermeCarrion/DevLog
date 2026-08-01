import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      // Sem correção ortográfica; caller pode sobrescrever via props
      spellCheck={false}
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-secondary/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Paleta curada que fica bem no tema escuro (lima é a primeira = padrão)
export const TAG_COLORS = [
  '#a3e635', // lima
  '#34d399', // esmeralda
  '#22d3ee', // ciano
  '#60a5fa', // azul
  '#a78bfa', // violeta
  '#f472b6', // rosa
  '#f87171', // vermelho
  '#fb923c', // laranja
  '#fbbf24', // âmbar
  '#9aa0aa', // cinza
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={color}
          className={cn(
            'flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer',
            value === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-popover',
          )}
          style={{ background: color }}
        >
          {value === color && (
            <Check className="size-3.5 text-black/70" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}

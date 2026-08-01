'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

// Radix não permite <Select.Item value="">. Como vários campos usam '' para
// "Todos"/"Sem projeto", traduzimos '' ↔ sentinel internamente — os call sites
// continuam usando '' normalmente.
const EMPTY = '__empty__';
const toRadix = (v: string) => (v === '' ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? '' : v);

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // opcional: dot de cor à esquerda (tags, grupos, prioridade)
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <SelectPrimitive.Root
      value={toRadix(value)}
      onValueChange={(v) => onValueChange(fromRadix(v))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-secondary/60 px-3 py-1 text-sm data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 cursor-pointer',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.color && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: selected.color }}
            />
          )}
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value || EMPTY}
                value={toRadix(o.value)}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:text-primary"
              >
                {o.color && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: o.color }}
                  />
                )}
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

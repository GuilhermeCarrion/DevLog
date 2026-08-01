'use client';

import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ColorPicker, TAG_COLORS } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { useCreateTag, useDeleteTag, useTags } from '@/hooks/use-tags';
import { cn } from '@/lib/utils';

// Seletor de tags do projeto: lista as tags do usuário como chips clicáveis
// (toggle), e permite criar uma tag nova (nome + cor) que já entra selecionada.
export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  }

  function handleCreate() {
    if (!name.trim()) return;
    createTag.mutate(
      { name: name.trim(), color },
      {
        onSuccess: (tag) => {
          onChange([...value, tag.id]); // já entra selecionada
          setName('');
          setColor(TAG_COLORS[0]);
          setCreating(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags?.map((tag) => {
          const active = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer',
                active
                  ? 'border-transparent text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
              style={
                active
                  ? { background: `${tag.color}22`, borderColor: `${tag.color}66` }
                  : undefined
              }
            >
              <span
                className="size-2 rounded-full"
                style={{ background: tag.color }}
              />
              {tag.name}
              {active && <Check className="size-3" />}
              <span
                role="button"
                title="Excluir tag"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Excluir a tag "${tag.name}" de vez?`)) {
                    onChange(value.filter((t) => t !== tag.id));
                    deleteTag.mutate(tag.id);
                  }
                }}
                className="ml-0.5 hidden text-muted-foreground/60 hover:text-destructive group-hover:inline"
              >
                <X className="size-3" />
              </span>
            </button>
          );
        })}

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-3" />
            Nova tag
          </button>
        )}
      </div>

      {creating && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Nome da tag (ex: Next, Pessoal…)"
              className="h-8"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={createTag.isPending || !name.trim()}
            >
              Criar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setName('');
              }}
            >
              Cancelar
            </Button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      )}
    </div>
  );
}

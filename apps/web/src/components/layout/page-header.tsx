import { DotField } from '@/components/ui/dot-field';

// Cabeçalho padrão das telas: mesma linguagem do hero da home — marcas de
// canto, rótulo mono, destaque em serifa e pontos à direita sumindo p/ esquerda.
export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  actions,
  children,
}: {
  eyebrow: React.ReactNode; // ex: "02 · Agenda"
  title: React.ReactNode;
  accent?: string; // complemento em serifa itálica
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // conteúdo extra abaixo da descrição
}) {
  return (
    <header className="frame relative isolate overflow-hidden rounded-md border border-border bg-card">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 w-3/5 [mask-image:linear-gradient(to_left,black,transparent)]"
      >
        <DotField cell={7} coverage={0.36} speed={0.8} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="label-mono flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 bg-primary" />
            {eyebrow}
          </div>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            {title}
            {accent && (
              <span className="serif-accent ml-2 text-[1.15em] text-foreground/80">
                {accent}
              </span>
            )}
          </h1>
          {description && (
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

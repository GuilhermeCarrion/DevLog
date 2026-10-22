import { AuthGate } from '@/components/auth/auth-gate';
import { PixelLogo } from '@/components/layout/sidebar';
import { DotField } from '@/components/ui/dot-field';

// Layout das telas públicas (login/registro): quadro com marcas de canto e o
// ">_" da marca em pontos ao fundo. AuthGate mode="guest": se já estiver
// logado, manda pro app.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest">
      <div className="flex min-h-screen flex-col p-3 sm:p-5">
        <div className="frame relative isolate flex flex-1 flex-col overflow-hidden rounded-md border border-border">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <DotField cell={10} coverage={0.46} />
          </div>
          {/* vinheta radial: o centro (formulário) fica limpo para leitura */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--background)_30%,transparent_80%)]"
          />

          <header className="flex items-center justify-between px-6 py-5">
            <span className="flex items-center gap-2.5 select-none">
              <PixelLogo className="h-3.5 w-5 text-primary" />
              <span className="font-semibold tracking-tight" translate="no">
                DevLog
              </span>
            </span>
            <span className="label-mono hidden sm:inline">
              Sessões · Tasks · Relatórios
            </span>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="label-mono inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-foreground/80">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                Registro de trabalho
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Seu trabalho,
                <span className="serif-accent block text-[1.18em] text-foreground/90">
                  bem registrado.
                </span>
              </h1>
            </div>
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}

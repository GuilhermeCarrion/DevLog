import { AuthGate } from '@/components/auth/auth-gate';

// Layout das telas públicas (login/registro): card centralizado, sem sidebar.
// AuthGate mode="guest": se já estiver logado, manda pro app.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest">
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
        <div className="flex items-center gap-2 select-none">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary font-mono text-lg font-bold text-primary-foreground">
            {'>'}
          </span>
          <span className="text-2xl font-semibold tracking-tight">DevLog</span>
        </div>
        {children}
      </div>
    </AuthGate>
  );
}

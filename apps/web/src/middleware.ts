import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'devlog_token';
const PUBLIC_PATHS = ['/login', '/registro'];

// Proteção de rota no edge: só checa a PRESENÇA do cookie (rápido, sem verificar
// assinatura). A validade real do JWT é decidida pela API — se o token for
// inválido, toda query retorna 401 e o front redireciona para /login.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(AUTH_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasToken && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (hasToken && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Ignora assets estáticos e favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

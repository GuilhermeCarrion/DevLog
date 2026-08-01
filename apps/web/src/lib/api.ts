// Cliente HTTP único do front.
// - credentials: 'include' → o cookie httpOnly do JWT viaja em toda request
// - erros da API viram ApiError com a mensagem que o NestJS retornou

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      // class-validator devolve message como array de mensagens
      message = Array.isArray(body.message)
        ? body.message.join('; ')
        : (body.message ?? message);
    } catch {
      /* corpo não é JSON — mantém mensagem genérica */
    }
    throw new ApiError(res.status, message);
  }

  // Respostas sem corpo (ex: GET /sessions/active sem sessão → null, ou 204 de
  // um DELETE) fariam res.json() estourar. Lê como texto e só faz parse se houver
  // conteúdo — senão devolve null. Sem isso, a query entra em erro e o React
  // Query mantém o dado antigo em cache (era a causa do badge de sessão não sumir).
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

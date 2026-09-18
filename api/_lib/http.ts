import type { VercelRequest, VercelResponse } from '@vercel/node';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function noStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
}

export function param(req: VercelRequest, name: string): string {
  const value = req.query[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function route(handlers: Partial<Record<string, Handler>>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const method = req.method ?? 'GET';
      const handler = handlers[method];
      if (!handler) throw new HttpError(405, `Method ${method} not allowed`);
      await handler(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (status >= 500) console.error(err);
      if (!res.headersSent) res.status(status).json({ error: message, details: err instanceof HttpError ? err.details : undefined });
    }
  };
}

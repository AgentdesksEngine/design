import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ALLOWED_EMAIL_DOMAIN: z.string().default('radiusagent.com'),
  DEV_LOGIN_EMAIL: z.string().optional(),
  DEV_LOGIN_PASSWORD: z.string().optional(),
  APP_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof schema> & { appUrl: string; isProduction: boolean };

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  const e = parsed.data;
  const appUrl =
    e.APP_URL ?? (e.VERCEL_URL ? `https://${e.VERCEL_URL}` : 'http://localhost:5174');
  cached = { ...e, appUrl: appUrl.replace(/\/$/, ''), isProduction: e.VERCEL_ENV === 'production' };
  return cached;
}

export function requireSupabaseEnv() {
  const e = env();
  if (!e.DATABASE_URL || !e.SUPABASE_URL || !e.SUPABASE_ANON_KEY || !e.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'DATABASE_URL / SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set. See .env.example.',
    );
  }
  return e as Env & {
    DATABASE_URL: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  };
}

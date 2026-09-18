import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AuthStatus } from '../../shared/types.js';
import { env } from '../_lib/env.js';
import { HttpError, noStore, param, route } from '../_lib/http.js';
import { toSessionUser } from '../_lib/session.js';
import { supabaseAdmin, supabaseForRequest } from '../_lib/supabase.js';

async function devLogin(req: VercelRequest, res: VercelResponse) {
  const e = env();
  if (e.isProduction || !e.DEV_LOGIN_EMAIL || !e.DEV_LOGIN_PASSWORD) throw new HttpError(404, 'Not found');
  const supabase = supabaseForRequest(req, res);
  const { error } = await supabase.auth.signInWithPassword({
    email: e.DEV_LOGIN_EMAIL,
    password: e.DEV_LOGIN_PASSWORD,
  });
  if (error) throw new HttpError(401, error.message);
  res.redirect(302, `${e.appUrl}/`);
}

async function logout(req: VercelRequest, res: VercelResponse) {
  await supabaseForRequest(req, res).auth.signOut();
  if (req.method === 'GET') res.redirect(302, `${env().appUrl}/`);
  else res.status(200).json({ ok: true });
}

async function me(req: VercelRequest, res: VercelResponse) {
  const e = env();
  noStore(res);
  const base = {
    authConfigured: Boolean(e.SUPABASE_URL && e.SUPABASE_ANON_KEY),
    devLoginAvailable: Boolean(e.DEV_LOGIN_EMAIL && e.DEV_LOGIN_PASSWORD) && !e.isProduction,
  };
  if (!e.SUPABASE_URL || !e.SUPABASE_ANON_KEY || !e.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(200).json({ user: null, ...base } satisfies AuthStatus);
    return;
  }
  const supabase = supabaseForRequest(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    res.status(200).json({ user: null, ...base } satisfies AuthStatus);
    return;
  }
  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('id, email, display_name, avatar_url, allowed')
    .eq('auth_user_id', user.id)
    .single();
  if (!profile?.allowed) {
    await supabase.auth.signOut();
    res.status(200).json({ user: null, deniedEmail: user.email ?? undefined, ...base } satisfies AuthStatus);
    return;
  }
  res.status(200).json({ user: toSessionUser(profile), ...base } satisfies AuthStatus);
}

const GET_ACTIONS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void>> = {
  'dev-login': devLogin,
  logout,
  me,
};

export default route({
  GET: async (req, res) => {
    const handler = GET_ACTIONS[param(req, 'action')];
    if (!handler) throw new HttpError(404, 'Not found');
    await handler(req, res);
  },
  POST: async (req, res) => {
    if (param(req, 'action') !== 'logout') throw new HttpError(404, 'Not found');
    await logout(req, res);
  },
});

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthStatus } from '@shared/types';
import { get, SIGNED_OUT_EVENT } from '@/api/client';
import { keys, useAuth } from '@/api/hooks';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function SignInPage() {
  const { data } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const authConfigured = data ? data.authConfigured : true;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setSending(false);
    if (err) setError(err.message);
    else {
      setStage('code');
      setCooldown(30);
    }
  };

  const verifyCode = async (e?: FormEvent, token = code) => {
    e?.preventDefault();
    if (!token.trim() || verifying) return;
    setVerifying(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (err) {
      setVerifying(false);
      setError(err.message);
      return;
    }
    const status = await qc.fetchQuery({ queryKey: keys.auth, queryFn: () => get<AuthStatus>('/api/auth/me') });
    qc.setQueryData(keys.auth, status);
    setVerifying(false);
    if (!status.user) setDeniedEmail(status.deniedEmail ?? email.trim());
  };

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !verifying) void verifyCode(undefined, digits);
  };

  if (deniedEmail) return <NotMemberPage email={deniedEmail} />;

  return (
    <div className="state-page">
      <div className="state-card">
        <Logo />
        <h1>Design Gallery</h1>
        <p>Sign in with your @radiusagent.com account to view internal prototypes.</p>
        {data && !data.authConfigured && (
          <span className="muted">Sign-in needs Supabase env values, but the email field stays editable for local testing.</span>
        )}
        {stage === 'email' ? (
          <form className="auth-form" onSubmit={(e) => void sendCode(e)}>
            <input
              className="input"
              type="email"
              placeholder="you@radiusagent.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Button type="submit" variant="primary" disabled={!authConfigured || sending}>
              {sending ? 'Sending...' : 'Send code'}
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(e) => void verifyCode(e)}>
            <p className="muted">We sent a six-digit code to <b>{email}</b>.</p>
            <input
              className="input mono"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              aria-label="Six-digit code"
              placeholder="123456"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              autoFocus
            />
            <Button type="submit" variant="primary" disabled={verifying || code.length < 6}>
              {verifying ? 'Verifying...' : 'Verify code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={cooldown > 0 || sending}
              onClick={() => void sendCode({ preventDefault: () => undefined } as FormEvent)}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Button>
          </form>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {data?.devLoginAvailable && (
          <Button variant="ghost" onClick={() => (window.location.href = '/api/auth/dev-login')}>
            Developer sign-in
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotMemberPage({ email }: { email?: string } = {}) {
  const [params] = useSearchParams();
  const shownEmail = email ?? params.get('email') ?? undefined;
  return (
    <div className="state-page">
      <div className="state-card">
        <Logo />
        <h1>Not a Radius Agent account</h1>
        <p>{shownEmail ? <span className="mono">{shownEmail}</span> : 'This account'} is not allowed in.</p>
        <Button onClick={() => (window.location.href = '/api/auth/logout')}>Try another account</Button>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, isError, refetch } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    const onSignedOut = () => qc.setQueryData(keys.auth, (a: AuthStatus | undefined) => (a ? { ...a, user: null } : a));
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, [qc]);
  if (isPending) return <div className="state-page"><span className="spinner" /></div>;
  if (isError) {
    return (
      <div className="state-page">
        <div className="state-card">
          <h1>Cannot reach the server</h1>
          <p>Check the local API or Vercel function logs and try again.</p>
          <Button onClick={() => void refetch()}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!data?.user) return <SignInPage />;
  return <>{children}</>;
}

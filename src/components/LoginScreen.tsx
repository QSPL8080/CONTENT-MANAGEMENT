import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Mail, ShieldCheck, ChevronDown, AlertTriangle } from 'lucide-react';
import { ContentFlowLogo } from './Logo';
import { api } from '../lib/api';
import type { User } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your internet connection.'));
    document.head.appendChild(script);
  });
}

interface LoginScreenProps {
  googleClientId: string | null;
  onSignedIn: (user: User) => void;
  notice?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ googleClientId, onSignedIn, notice }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [error, setError] = useState<string | null>(notice || null);

  const [showPasswordForm, setShowPasswordForm] = useState(!googleClientId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setError(notice || null);
  }, [notice]);

  // Render the official Google button ("Continue with Google")
  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (resp: { credential?: string }) => {
            if (!resp?.credential) {
              setError('Google did not return a sign-in credential. Please try again.');
              return;
            }
            setGoogleBusy(true);
            setError(null);
            try {
              const res = await api.loginWithGoogle(resp.credential);
              onSignedIn(res.user);
            } catch (err: any) {
              setError(err.message || 'Google sign-in failed');
            } finally {
              setGoogleBusy(false);
            }
          },
        });
        const width = Math.min(360, googleBtnRef.current.parentElement?.clientWidth || 320);
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width,
        });
        setGoogleReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setGoogleFailed(true);
          setShowPasswordForm(true);
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, onSignedIn]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await api.login({ email: email.trim(), password });
      onSignedIn(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/90 p-7 sm:p-10 relative z-10 text-slate-900">
        <div className="flex flex-col items-center text-center mb-7">
          <ContentFlowLogo size="xl" theme="light" className="justify-center mb-1.5" />
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">
            Social Media Content &amp; Publishing Management
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 font-medium" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        {/* Google sign-in — team members */}
        {googleClientId ? (
          <div className="space-y-3">
            <div className="flex justify-center min-h-[44px] relative">
              <div ref={googleBtnRef} className={googleBusy ? 'opacity-40 pointer-events-none' : ''} />
              {googleFailed && !googleReady && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                >
                  Retry loading Google sign-in
                </button>
              )}
              {!googleFailed && (!googleReady || googleBusy) && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{googleBusy ? 'Signing you in…' : 'Loading Google sign-in…'}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-center text-slate-500 leading-relaxed">
              Team members sign in with their Google account. Only emails added by an Admin on the
              Team page can get in.
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed">
            <strong>Google sign-in is not set up yet.</strong> Add <code className="font-mono">GOOGLE_CLIENT_ID</code> to
            the server's <code className="font-mono">.env</code> file and restart. Until then, only password sign-in works.
          </div>
        )}

        {/* Email + password — Super Admin (and anyone given a password) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowPasswordForm(v => !v)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider"
            aria-expanded={showPasswordForm}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Super Admin sign-in
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPasswordForm ? 'rotate-180' : ''}`} />
          </button>

          {showPasswordForm && (
            <form onSubmit={handlePasswordLogin} className="space-y-3.5 mt-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In &rarr;</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types';

interface ChangePasswordModalProps {
  /** Forced = the user is on a temporary/default password and must set their own before continuing. */
  forced?: boolean;
  userName: string;
  onClose: () => void;
  onChanged: (user: User) => void;
  onLogout?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ forced, userName, onClose, onChanged, onLogout }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    if (next === current) return setError('New password must be different from the current one.');
    setSaving(true);
    try {
      const res = await api.changePassword(current, next);
      setDone(true);
      setTimeout(() => onChanged(res.user), 900);
    } catch (err: any) {
      setError(err.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none font-mono';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{forced ? 'Set your own password' : 'Change password'}</h3>
              <p className="text-xs text-slate-500">{userName}</p>
            </div>
          </div>
          {!forced && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {done ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">Password changed</p>
            <p className="text-xs text-slate-500">Use your new password next time you sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {forced && (
              <div className="p-3 text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg leading-relaxed">
                You signed in with a temporary password. Choose your own password to continue — only you will know it.
              </div>
            )}
            {error && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg" role="alert">{error}</div>
            )}

            <div>
              <label htmlFor="cp-current" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current password
              </label>
              <input
                id="cp-current"
                type={show ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="cp-new" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New password <span className="text-slate-400 font-normal normal-case">(at least 8 characters)</span>
              </label>
              <input
                id="cp-new"
                type={show ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="cp-confirm" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm new password
              </label>
              <input
                id="cp-confirm"
                type={show ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
              />
            </div>

            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>

            <div className="pt-1 flex items-center justify-between gap-2.5">
              {forced && onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

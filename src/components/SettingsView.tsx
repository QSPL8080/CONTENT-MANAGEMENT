import React, { useEffect, useState } from 'react';
import { 
  Check, 
  Loader2, 
  Save, 
  Globe, 
  Share2, 
  ShieldCheck, 
  Bell, 
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { api } from '../lib/api';
import { canManageTeam } from '../lib/roles';
import type { Platform, User, WorkspaceSettings } from '../types';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
];

interface SettingsViewProps {
  currentUser: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const canEdit = canManageTeam(currentUser.role);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const res = await api.getSettings();
      setSettings(res.settings);
    } catch (err: any) {
      setLoadError(err.message || 'Could not load settings');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-rose-200 text-sm text-rose-700 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {loadError}</span>
        <button onClick={load} className="px-3 py-1.5 rounded-lg border border-rose-300 text-xs font-semibold hover:bg-rose-50">Retry</button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-10 flex items-center justify-center text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  const set = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) =>
    setSettings({ ...settings, [key]: value });

  const inputCls =
    'w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-60';

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Workspace configuration, timezone, publishing defaults and storage policies.</p>
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving…' : saved ? 'Saved' : 'Save settings'}</span>
          </button>
        )}
      </div>

      {saveError && (
        <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg" role="alert">{saveError}</div>
      )}

      {/* Storage Lifecycle Info Box */}
      <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Automated 90-Day Storage Cleanup Active</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The system automatically purges media files and temporary upload chunks older than 90 days in the background to prevent server disk overflow. All post records, captions, and history remain intact.
            </p>
          </div>
        </div>
      </section>

      {/* General Workspace & Publishing Settings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-full">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> Workspace</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-name" className="block text-xs font-semibold text-slate-700 mb-1.5">Workspace name</label>
              <input
                id="set-name"
                type="text"
                disabled={!canEdit}
                value={settings.workspace_name}
                onChange={(e) => set('workspace_name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="set-tz" className="block text-xs font-semibold text-slate-700 mb-1.5">Default timezone</label>
              <select
                id="set-tz"
                disabled={!canEdit}
                value={settings.default_timezone}
                onChange={(e) => set('default_timezone', e.target.value)}
                className={inputCls}
              >
                {(TIMEZONES.includes(settings.default_timezone) ? TIMEZONES : [settings.default_timezone, ...TIMEZONES]).map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Used for "today" and overdue checks on the server.</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-full">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Share2 className="w-4 h-4 text-slate-400" /> Publishing</h3>
          <div>
            <label htmlFor="set-platform" className="block text-xs font-semibold text-slate-700 mb-1.5">Default posting platform</label>
            <select
              id="set-platform"
              disabled={!canEdit}
              value={settings.default_platform}
              onChange={(e) => set('default_platform', e.target.value as Platform)}
              className={inputCls}
            >
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </section>
      </div>

      <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /> Permissions &amp; notifications</h3>
        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={settings.allow_editor_replace}
            onChange={(e) => set('allow_editor_replace', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-slate-900"
          />
          <span>
            <span className="font-semibold block">Designers &amp; video editors can replace an uploaded file</span>
            <span className="text-xs text-slate-500">Only before the content is posted. Admins and Managers can always replace.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={settings.notification_email}
            onChange={(e) => set('notification_email', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-slate-900"
          />
          <span>
            <span className="font-semibold block flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Notification preference</span>
            <span className="text-xs text-slate-500">In-app notifications are always on. This saves the team's email-alert preference for when email delivery is connected.</span>
          </span>
        </label>
      </section>

      {!canEdit && (
        <p className="text-xs text-slate-500">Only the Super Admin and Admins can change settings.</p>
      )}
    </form>
  );
};

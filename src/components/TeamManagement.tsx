import React, { useMemo, useState } from 'react';
import { User, UserRole, ContentItem } from '../types';
import { UserAvatar } from './UserAvatar';
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_BADGE_CLASSES,
  assignableRoles,
  canManageTeam,
  canEditTeamInfo,
  ADMIN_EDITABLE_ROLES,
  isCreator,
  isPoster,
} from '../lib/roles';
import { UserPlus, X, Pencil, Search, KeyRound, Ban, CheckCircle2, UserCog, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';

interface TeamManagementProps {
  users: User[];
  contentList: ContentItem[];
  currentUser: User;
  onAddUser: (user: Partial<User> & { password?: string }) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<User> & { password?: string }) => Promise<void>;
}

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'disabled';
  password: string;
};

const EMPTY_FORM: FormState = { name: '', email: '', role: 'poster', status: 'active', password: '' };

export const TeamManagement: React.FC<TeamManagementProps> = ({
  users,
  contentList,
  currentUser,
  onAddUser,
  onUpdateUser,
}) => {
  // Super Admin: everything. Admin: edit name/email/role of non-admin members only.
  const canEdit = canManageTeam(currentUser.role);
  const isSuperAdmin = currentUser.role === 'super_admin';
  const roleOptions = isSuperAdmin ? assignableRoles(currentUser.role) : ADMIN_EDITABLE_ROLES;

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  // Super Admin: revealed passwords (auto-hidden after 30 seconds)
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealError, setRevealError] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const hidePassword = (id: string) =>
    setRevealed(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const showPassword = async (u: User) => {
    setRevealError(prev => ({ ...prev, [u.id]: '' }));
    try {
      const res = await api.revealPassword(u.id);
      setRevealed(prev => ({ ...prev, [u.id]: res.password }));
      setTimeout(() => hidePassword(u.id), 30000);
    } catch (err: any) {
      setRevealError(prev => ({ ...prev, [u.id]: err.message || 'Cannot show password' }));
    }
  };

  const copyPassword = async (u: User) => {
    try {
      await navigator.clipboard.writeText(revealed[u.id]);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const openAdd = (role: UserRole = 'poster') => {
    setForm({ ...EMPTY_FORM, role: roleOptions.includes(role) ? role : roleOptions[roleOptions.length - 1] });
    setEditingUser(null);
    setError(null);
    setModalMode('add');
  };

  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, password: '' });
    setEditingUser(user);
    setError(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setError(null);
  };

  const canEditUser = (u: User) =>
    isSuperAdmin ||
    (canEditTeamInfo(currentUser.role) && u.role !== 'super_admin' && u.role !== 'admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    if (modalMode === 'add' && !form.password) {
      setError('Set a password for this member — they sign in with this email and password.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await onAddUser({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          password: form.password,
        });
      } else if (editingUser) {
        const updates: Partial<User> & { password?: string } = {};
        if (form.name.trim() !== editingUser.name) updates.name = form.name.trim();
        if (form.email.trim().toLowerCase() !== editingUser.email) updates.email = form.email.trim().toLowerCase();
        if (form.role !== editingUser.role) updates.role = form.role;
        if (isSuperAdmin && form.status !== editingUser.status) updates.status = form.status;
        if (isSuperAdmin && form.password) updates.password = form.password;
        if (Object.keys(updates).length > 0) {
          await onUpdateUser(editingUser.id, updates);
        }
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Could not save team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (u: User) => {
    const next = u.status === 'active' ? 'disabled' : 'active';
    if (next === 'disabled' && !window.confirm(`Deactivate ${u.name}? They will be signed out immediately and cannot sign in until activated again.`)) {
      return;
    }
    setBusyUserId(u.id);
    try {
      await onUpdateUser(u.id, { status: next });
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    } finally {
      setBusyUserId(null);
    }
  };

  const getUserWorkload = (u: User) => {
    if (isCreator(u.role)) {
      const assigned = contentList.filter(c => c.editor_id === u.id);
      return {
        total: assigned.length,
        active: assigned.filter(c => ['PLANNED', 'EDITING', 'REVISION'].includes(c.status)).length,
        done: assigned.filter(c => c.status === 'READY_TO_POST' || c.status === 'POSTED').length,
        labels: ['Assigned', 'To do', 'Delivered'],
      };
    }
    if (isPoster(u.role)) {
      const assigned = contentList.filter(c => c.poster_id === u.id);
      return {
        total: assigned.length,
        active: assigned.filter(c => c.status === 'READY_TO_POST').length,
        done: assigned.filter(c => c.status === 'POSTED').length,
        labels: ['Assigned', 'To post', 'Posted'],
      };
    }
    return null;
  };

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter(
      u => u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f) || ROLE_LABELS[u.role].toLowerCase().includes(f)
    );
  }, [users, filter]);

  const activeCount = users.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{canEdit ? 'Manage Users' : 'Team'}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            {activeCount} active member{activeCount === 1 ? '' : 's'}. Only the accounts listed here can sign in, with the email and password set by the Super Admin.
            {isSuperAdmin
              ? ' You are the only one who can add or deactivate members and set passwords.'
              : canEditTeamInfo(currentUser.role)
              ? ' You can edit members\' details. Adding, deactivating and passwords are handled by the Super Admin.'
              : ' Only the Super Admin can add, edit or deactivate members.'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search name, email or role"
              className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
            />
          </div>
          {canEdit && (
            <button
              onClick={() => openAdd()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add member</span>
            </button>
          )}
        </div>
      </div>

      {ALL_ROLES.map((role) => {
        const members = filtered.filter(u => u.role === role);
        // Always show the Manager group so the DMM can be added; hide other empty groups while searching
        if (members.length === 0 && (filter || role !== 'manager')) return null;

        return (
          <section key={role} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-slate-900">{ROLE_LABELS[role]}s</h2>
                <span className="text-xs text-slate-400">{members.length}</span>
              </div>
              <span className="text-[11px] text-slate-400">{ROLE_DESCRIPTIONS[role]}</span>
            </div>

            {members.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-slate-500">
                  No {ROLE_LABELS[role].toLowerCase()} added yet.
                  {role === 'manager' && ' Add the DMM here once you have their email.'}
                </p>
                {canEdit && roleOptions.includes(role) && (
                  <button
                    onClick={() => openAdd(role)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add {ROLE_LABELS[role]}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                {members.map((u) => {
                  const stats = getUserWorkload(u);
                  const disabled = u.status === 'disabled';
                  return (
                    <div
                      key={u.id}
                      className={`bg-white p-4 rounded-2xl border shadow-2xs space-y-3 ${disabled ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar user={u} size="md" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">
                              {u.name}
                              {u.id === currentUser.id && <span className="text-slate-400 font-medium"> (you)</span>}
                            </h4>
                            <span className="text-[11px] text-slate-500 block truncate" title={u.email}>{u.email}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${ROLE_BADGE_CLASSES[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </div>

                      {stats && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 text-center gap-1">
                          <div>
                            <span className="block font-bold text-slate-800 text-sm">{stats.total}</span>
                            <span className="text-[10px] text-slate-400">{stats.labels[0]}</span>
                          </div>
                          <div>
                            <span className="block font-bold text-amber-600 text-sm">{stats.active}</span>
                            <span className="text-[10px] text-slate-400">{stats.labels[1]}</span>
                          </div>
                          <div>
                            <span className="block font-bold text-emerald-600 text-sm">{stats.done}</span>
                            <span className="text-[10px] text-slate-400">{stats.labels[2]}</span>
                          </div>
                        </div>
                      )}

                      {canEdit && u.has_password && (
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {revealed[u.id] !== undefined ? (
                              <code className="font-mono text-slate-900 truncate select-all">{revealed[u.id]}</code>
                            ) : revealError[u.id] ? (
                              <span className="text-rose-600 truncate" title={revealError[u.id]}>{revealError[u.id]}</span>
                            ) : (
                              <span className="text-slate-400 tracking-widest">••••••••</span>
                            )}
                          </span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            {revealed[u.id] !== undefined && (
                              <button
                                onClick={() => copyPassword(u)}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                                title="Copy password"
                                aria-label={`Copy ${u.name}'s password`}
                              >
                                {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={() => (revealed[u.id] !== undefined ? hidePassword(u.id) : showPassword(u))}
                              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                              title={revealed[u.id] !== undefined ? 'Hide password' : 'Show password'}
                              aria-label={revealed[u.id] !== undefined ? `Hide ${u.name}'s password` : `Show ${u.name}'s password`}
                            >
                              {revealed[u.id] !== undefined ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${disabled ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          <span className="truncate">{disabled ? 'Deactivated' : 'Active'}</span>
                        </span>

                        {canEditUser(u) && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              title="Edit"
                              aria-label={`Edit ${u.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {isSuperAdmin && u.id !== currentUser.id && (
                              <button
                                onClick={() => toggleStatus(u)}
                                disabled={busyUserId === u.id}
                                className={`p-1.5 rounded-lg disabled:opacity-40 ${
                                  disabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'
                                }`}
                                title={disabled ? 'Activate' : 'Deactivate'}
                                aria-label={disabled ? `Activate ${u.name}` : `Deactivate ${u.name}`}
                              >
                                {disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Add / Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  {modalMode === 'add' ? <UserPlus className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {modalMode === 'add' ? 'Add team member' : `Edit ${editingUser?.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isSuperAdmin ? 'Signs in with this email and the password you set' : 'Edit name, email and role'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg" role="alert">{error}</div>
              )}

              <div>
                <label htmlFor="tm-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Full name</label>
                <input
                  id="tm-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="tm-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  id="tm-email"
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="tm-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Role</label>
                <select
                  id="tm-role"
                  value={form.role}
                  disabled={modalMode === 'edit' && editingUser?.id === currentUser.id}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-60"
                >
                  {(roleOptions.includes(form.role) ? roleOptions : [form.role, ...roleOptions]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">{ROLE_DESCRIPTIONS[form.role]}</p>
              </div>

              {isSuperAdmin && modalMode === 'edit' && editingUser?.id !== currentUser.id && (
                <div>
                  <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Status</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['active', 'disabled'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setForm({ ...form, status: st })}
                        className={`py-2 rounded-lg text-xs font-semibold border ${
                          form.status === st
                            ? st === 'active'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-rose-600 border-rose-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {st === 'active' ? 'Active' : 'Deactivated'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSuperAdmin && (
              <div>
                <label htmlFor="tm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  <span className="inline-flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Password</span>{' '}
                  <span className="text-slate-400 font-normal normal-case">
                    ({modalMode === 'edit' ? (editingUser?.has_password ? 'leave blank to keep the current one' : 'not set yet — set one so they can sign in') : 'required'})
                  </span>
                </label>
                <input
                  id="tm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={modalMode === 'edit' && editingUser?.has_password ? '•••••••• (set)' : 'At least 8 characters'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Saving…' : modalMode === 'add' ? 'Add member' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

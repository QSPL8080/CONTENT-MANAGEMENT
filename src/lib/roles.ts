import type { UserRole } from '../types';

/** Every role, in display order (most → least access). */
export const ALL_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'graphic_designer',
  'editor',
  'poster',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  graphic_designer: 'Graphic Designer',
  editor: 'Video Editor',
  poster: 'Intern',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Owner account — full control, including admins and settings',
  admin: 'Full access — content, assignments, team and settings',
  manager: 'Creates, assigns and reviews content (no team or settings changes)',
  graphic_designer: 'Designs assigned posts and uploads final creatives',
  editor: 'Edits assigned videos and uploads final cuts',
  poster: 'Downloads final assets, publishes them and marks them posted',
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  super_admin: 'bg-rose-50 text-rose-700 border-rose-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  manager: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  graphic_designer: 'bg-pink-50 text-pink-700 border-pink-200',
  editor: 'bg-amber-50 text-amber-800 border-amber-200',
  poster: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const ROLE_DOT_CLASSES: Record<UserRole, string> = {
  super_admin: 'bg-rose-600',
  admin: 'bg-purple-600',
  manager: 'bg-indigo-600',
  graphic_designer: 'bg-pink-600',
  editor: 'bg-amber-600',
  poster: 'bg-emerald-600',
};

export const roleLabel = (role?: string | null): string =>
  (role && ROLE_LABELS[role as UserRole]) || 'Member';

export const isValidRole = (role: unknown): role is UserRole =>
  typeof role === 'string' && (ALL_ROLES as string[]).includes(role);

/** Super Admin, Admin and Manager: see and manage all content. */
export const isManagerial = (role?: string | null): boolean =>
  role === 'super_admin' || role === 'admin' || role === 'manager';

/** Super Admin and Admin: manage team members and workspace settings. */
export const canManageTeam = (role?: string | null): boolean =>
  role === 'super_admin' || role === 'admin';

/** Graphic Designers and Video Editors: produce and upload the final asset. */
export const isCreator = (role?: string | null): boolean =>
  role === 'graphic_designer' || role === 'editor';

/** Interns: publish assigned content. */
export const isPoster = (role?: string | null): boolean => role === 'poster';

/** Which roles the acting user may assign to someone else. */
export const assignableRoles = (actorRole?: string | null): UserRole[] => {
  if (actorRole === 'super_admin') return ALL_ROLES;
  if (actorRole === 'admin') return ALL_ROLES.filter(r => r !== 'super_admin');
  return [];
};

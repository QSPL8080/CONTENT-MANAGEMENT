import type { UserRole } from '../src/types';

/**
 * Quickupp Softech ContentFlow team roster (from the SRS, page 17–18).
 *
 * Every email here is seeded into the users table on server start (if it is not
 * already there) with the default team password (TEAM_DEFAULT_PASSWORD, default
 * "Quickupp@123"). Admins can change any password on the Team page.
 * Only accounts in the users table can sign in.
 *
 * Seeding never overwrites a user that already exists, so any change an admin
 * makes later on the Team page (name, email, role, disabling) is preserved.
 *
 * Manager (DMM) email has not been given yet — add it from the Team page
 * (role: Manager) — Admins can add or change team members.
 */
export interface RosterEntry {
  name: string;
  email: string;
  role: UserRole;
  /** WhatsApp number for "Send ticket on WhatsApp" (filled in only if the account has none yet) */
  whatsapp?: string;
}

export const TEAM_ROSTER: RosterEntry[] = [
  // Admins
  { name: 'Quickupp CMO', email: 'quickuppsoftech.cmo@gmail.com', role: 'admin', whatsapp: '8261890834' },
  { name: 'Snehal Pawar', email: 'snehalpawar12014@gmail.com', role: 'admin', whatsapp: '8956583052' },

  // Manager (DMM) — email to be provided
  // { name: 'DMM', email: '<manager-email>@gmail.com', role: 'manager' },

  // Graphic Designers
  // NOTE: the SRS lists "qs.graphicdesingner@gamil.com" — "gamil" is treated as a typo for gmail.
  { name: 'Devyani Ankush Bhoye', email: 'qs.graphicdesingner@gmail.com', role: 'graphic_designer' },
  { name: 'Rutuja Ganesh Pawar', email: 'qsgraphicdesigner2@gmail.com', role: 'graphic_designer' },
  { name: 'Swapnil Nawadkar', email: 'quickupp.graphicdesigns@gmail.com', role: 'graphic_designer' },

  // Video Editors
  { name: 'Ubaid Maner', email: 'dmquickuppsoftech@gmail.com', role: 'editor' },
  { name: 'Rahul Sanjay Mahajan', email: 'qs.photography0079@gmail.com', role: 'editor' },

  // Interns (posting interns)
  { name: 'Pratiksha Magatrao', email: 'qsdmintern01@gmail.com', role: 'poster' },
  // NOTE: in the SRS this email sits between Pratiksha and Tanisha; assigned to Tanisha.
  { name: 'Tanisha Suresh Bangde', email: 'qsdmintern4@gmail.com', role: 'poster' },
  { name: 'Gayatri Ratnakar Sitafale', email: 'qsintern009@gmail.com', role: 'poster' },
  { name: 'Kiran B Arote', email: 'qsdmintern03@gmail.com', role: 'poster' },
];

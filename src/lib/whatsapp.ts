import type { ContentItem, User } from '../types';
import { roleLabel } from './roles';

/**
 * "Send ticket on WhatsApp": opens WhatsApp (app or WhatsApp Web) with the task details already
 * typed in, addressed to a person's number — the person only taps Send. No WhatsApp account
 * or paid service is needed on the ContentOps side.
 */

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  facebook: 'Facebook',
};

/** Digits with country code for wa.me ("8261890834" → "918261890834"); '' if none. */
export function whatsappDigits(raw?: string | null): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return `91${d}`; // Indian mobile number without country code
  if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
  return d;
}

function niceDate(date: string, time?: string): string {
  const [y, m, d] = (date || '').split('-').map(Number);
  if (!y || !m || !d) return [date, time].filter(Boolean).join(' ');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let t = '';
  if (time) {
    const [hh, mm] = time.slice(0, 5).split(':').map(Number);
    if (!Number.isNaN(hh)) t = `, ${((hh + 11) % 12) + 1}:${String(mm || 0).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }
  return `${d} ${months[m - 1]} ${y}${t}`;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** The ticket, formatted for WhatsApp (*bold*). */
export function ticketMessage(item: ContentItem, users: User[]): string {
  const byId = (id?: string) => users.find((u) => u.id === id);
  const assignee = byId(item.editor_id);
  const intern = byId(item.poster_id);
  const creator = byId(item.created_by);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const lines: (string | false)[] = [
    `*📋 Task ticket — Quickupp ContentOps*`,
    ``,
    `*${item.title}*`,
    `• Type: ${cap(item.content_type)} · ${PLATFORM_NAMES[item.platform] || cap(item.platform)}`,
    `• Due: ${niceDate(item.scheduled_date, item.scheduled_time)}`,
    `• Assigned to: ${assignee ? `${assignee.name} (${roleLabel(assignee.role)})` : 'Not assigned'}`,
    `• Intern: ${intern ? intern.name : 'Not assigned yet'}`,
    !!item.category && `• Category: ${item.category}`,
    !!item.description?.trim() && `\n*Brief*\n${item.description.trim()}`,
    !!item.instructions?.trim() && `\n*Instructions*\n${item.instructions.trim()}`,
    !!item.caption?.trim() && `\n*Caption*\n${item.caption.trim()}`,
    !!item.hashtags?.trim() && `\n*Hashtags*\n${item.hashtags.trim()}`,
    ``,
    !!origin && `Open task: ${origin}/?content_id=${encodeURIComponent(item.id)}`,
    !!creator && `Created by ${creator.name}`,
  ];
  return lines.filter((l) => l !== false && l !== null && l !== undefined).join('\n');
}

/** wa.me link: to that number, or (no number) WhatsApp lets you pick the chat. */
export function whatsappLink(number: string | null | undefined, text: string): string {
  const to = whatsappDigits(number);
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

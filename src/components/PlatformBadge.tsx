import React from 'react';
import { Platform, ContentType } from '../types';
import { 
  Instagram, 
  Linkedin, 
  Twitter, 
  Youtube, 
  Facebook, 
  Share2,
  Film,
  Layers,
  FileImage,
  Sparkles,
  MessageSquare,
  Megaphone
} from 'lucide-react';

export const PlatformBadge: React.FC<{ platform: Platform; className?: string }> = ({
  platform,
  className = '',
}) => {
  const configs: Record<Platform, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    instagram: {
      label: 'Instagram',
      bg: 'bg-pink-50 border-pink-200',
      text: 'text-pink-700',
      icon: Instagram,
    },
    tiktok: {
      label: 'TikTok',
      bg: 'bg-neutral-900 border-neutral-800',
      text: 'text-white',
      icon: Share2,
    },
    youtube_shorts: {
      label: 'YouTube Shorts',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: Youtube,
    },
    linkedin: {
      label: 'LinkedIn',
      bg: 'bg-sky-50 border-sky-200',
      text: 'text-sky-700',
      icon: Linkedin,
    },
    x: {
      label: 'X (Twitter)',
      bg: 'bg-neutral-100 border-neutral-300',
      text: 'text-neutral-800',
      icon: Twitter,
    },
    facebook: {
      label: 'Facebook',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: Facebook,
    },
  };

  const config = configs[platform] || configs.instagram;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
};

export const ContentTypeBadge: React.FC<{ type: ContentType; className?: string }> = ({
  type,
  className = '',
}) => {
  const labels: Record<ContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    reel: { label: 'Reel', icon: Film },
    short: { label: 'Short', icon: Film },
    carousel: { label: 'Carousel', icon: Layers },
    static: { label: 'Static Post', icon: FileImage },
    story: { label: 'Story', icon: Sparkles },
    thread: { label: 'Thread', icon: MessageSquare },
    announcement: { label: 'Announcement', icon: Megaphone },
    other: { label: 'Content', icon: Film },
  };

  const item = labels[type] || labels.reel;
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 font-medium ${className}`}>
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <span>{item.label}</span>
    </span>
  );
};

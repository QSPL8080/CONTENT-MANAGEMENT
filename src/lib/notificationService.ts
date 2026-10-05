/**
 * notificationService.ts
 * Manages audio chime synthesized via Web Audio API and Native HTML5 Desktop Browser Notifications.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// User interaction hook to unlock Web Audio autoplay policy
export function initAudioOnGesture(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

/**
 * Plays a pleasant, professional 2-tone melodic notification chime (D5 -> A5 bell chime).
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playChimeNodes(ctx)).catch(() => {});
      return;
    }

    playChimeNodes(ctx);
  } catch (err) {
    console.warn('Audio notification chime could not play:', err);
  }
}

function playChimeNodes(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Master gain
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.22, now);
  masterGain.connect(ctx.destination);

  // Tone 1: 587.33 Hz (D5) - soft bell
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now);

  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.7, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.connect(gain1);
  gain1.connect(masterGain);

  osc1.start(now);
  osc1.stop(now + 0.36);

  // Tone 2: 880 Hz (A5) - bright chime
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.1);

  gain2.gain.setValueAtTime(0, now + 0.1);
  gain2.gain.linearRampToValueAtTime(0.85, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

  osc2.connect(gain2);
  gain2.connect(masterGain);

  osc2.start(now + 0.1);
  osc2.stop(now + 0.66);

  // Subtle shimmer harmonic (1760 Hz) for bell crispness
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(1760, now + 0.12);

  gain3.gain.setValueAtTime(0, now + 0.12);
  gain3.gain.linearRampToValueAtTime(0.2, now + 0.14);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc3.connect(gain3);
  gain3.connect(masterGain);

  osc3.start(now + 0.12);
  osc3.stop(now + 0.46);
}

/**
 * Checks current browser notification permission status.
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests desktop browser notification permissions.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    // Also unlock audio context
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Registers Service Worker to allow desktop pop-up notifications
 * to display on screen even when the page is inactive or tab is in background.
 */
let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Triggers a native desktop/browser notification pop-up.
 * Works even when the browser is backgrounded, minimized, or in another tab!
 */
export async function sendDesktopNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    contentId?: string;
    onClick?: () => void;
  }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const tag = options?.tag || `notif-${Date.now()}`;
  const icon = options?.icon || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png';
  const badge = 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png';

  // Primary: Service Worker showNotification (supports system level persistence & requireInteraction)
  try {
    let reg: ServiceWorkerRegistration | null | undefined = swRegistration;
    if (!reg && 'serviceWorker' in navigator) {
      reg = await navigator.serviceWorker.getRegistration();
    }
    if (reg) {
      await reg.showNotification(title, {
        body: options?.body || '',
        tag,
        icon,
        badge,
        requireInteraction: true, // Remains on screen on Windows/Mac until dismissed
        data: {
          contentId: options?.contentId,
        },
      });
      return;
    }
  } catch (swErr) {
    console.warn('Service worker notification fallback to standard Notification:', swErr);
  }

  // Fallback: standard Window Notification constructor
  try {
    const notif = new Notification(title, {
      body: options?.body || '',
      tag,
      icon,
      silent: false,
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick!();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Could not display desktop notification:', err);
  }
}

/**
 * Dispatches a comprehensive workflow alert:
 * Plays melodic chime, sends desktop system pop-up notification,
 * and sets up one-click task focus.
 */
export function triggerWorkflowNotification(params: {
  title: string;
  message: string;
  type?: 'posted' | 'ready_to_post' | 'revision' | 'issue' | 'assigned' | 'general';
  contentId?: string;
  onClick?: () => void;
}): void {
  // 1. Synthesize audio chime
  playNotificationSound();

  // 2. Format icon and tag
  const tag = params.contentId ? `task-${params.contentId}-${Date.now()}` : `flow-${Date.now()}`;

  // 3. Dispatch native screen pop-up
  sendDesktopNotification(params.title, {
    body: params.message,
    tag,
    contentId: params.contentId,
    onClick: params.onClick,
  });
}

/**
 * Combined helper: Plays chime sound AND shows desktop notification for assignments.
 */
export function triggerTaskAssignmentNotification(params: {
  taskTitle: string;
  roleAssigned: string;
  scheduledDate: string;
  scheduledTime: string;
  assignedBy?: string;
  contentId?: string;
  onClick?: () => void;
}): void {
  const assigner = params.assignedBy || 'Manager';
  const roleLabel = params.roleAssigned === 'editor' ? 'Video Editor' : params.roleAssigned === 'poster' ? 'Posting Intern' : params.roleAssigned;

  triggerWorkflowNotification({
    title: `📋 Task Assigned: "${params.taskTitle}"`,
    message: `${assigner} assigned you as ${roleLabel}.\nDue: ${params.scheduledDate} at ${params.scheduledTime}.`,
    type: 'assigned',
    contentId: params.contentId,
    onClick: params.onClick,
  });
}

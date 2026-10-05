import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const ContentFlowLogo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  theme = 'auto',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  }[size];

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[size];

  const subtitleSizes = {
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSizes} shrink-0 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-[1.5px]`}>
        <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-blue-500/20 to-cyan-400/40" />
          
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5 relative z-10 drop-shadow-md"
          >
            <defs>
              <linearGradient id="cf-grad-1" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
              <linearGradient id="cf-grad-2" x1="12" y1="6" x2="26" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>
            </defs>

            <rect
              x="4.5"
              y="4.5"
              width="23"
              height="23"
              rx="6.5"
              stroke="url(#cf-grad-1)"
              strokeWidth="1.8"
              strokeOpacity="0.45"
            />
            
            <path
              d="M6 17.5C9.5 12 14.5 22 19 16.5C21.5 13.5 24 14.5 26 16"
              stroke="url(#cf-grad-1)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 11.5L21.5 16L13.5 20.5V11.5Z"
              fill="url(#cf-grad-2)"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <div className={`font-black tracking-tight ${titleSizes} flex items-center gap-1`}>
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              Content
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-black">
              Flow
            </span>
          </div>
          <span className={`${subtitleSizes} font-semibold uppercase tracking-wider text-slate-400`}>
            Publishing Ops
          </span>
        </div>
      )}
    </div>
  );
};

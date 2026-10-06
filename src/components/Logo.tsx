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
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-10 h-10 sm:w-11 sm:h-11',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
  }[size];

  const quickuppTextSizes = {
    sm: 'text-sm sm:text-base font-bold tracking-normal leading-none',
    md: 'text-base sm:text-lg font-bold tracking-normal leading-none',
    lg: 'text-xl sm:text-2xl font-bold tracking-normal leading-none',
    xl: 'text-3xl sm:text-4xl font-bold tracking-normal leading-none',
  }[size];

  const contentOpsTextSizes = {
    sm: 'text-[11px] sm:text-xs font-extrabold leading-none',
    md: 'text-xs sm:text-sm font-extrabold leading-none',
    lg: 'text-sm sm:text-base font-extrabold leading-none',
    xl: 'text-xl sm:text-2xl font-extrabold leading-none',
  }[size];

  const dividerHeights = {
    sm: 'h-6',
    md: 'h-7 sm:h-8',
    lg: 'h-9 sm:h-10',
    xl: 'h-12 sm:h-14',
  }[size];

  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 select-none ${className}`}>
      {/* Exact Official Quickupp 3D Q Logo */}
      <div className={`relative ${iconSizes} shrink-0 flex items-center justify-center`}>
        <img
          src="/quickupp-q.png"
          alt="Quickupp"
          className="w-full h-full object-contain drop-shadow-2xs select-none"
          loading="eager"
        />
      </div>

      {showText && (
        <>
          {/* Vertical Gradient Divider */}
          <div
            className={`w-[2px] ${dividerHeights} rounded-full bg-gradient-to-b from-[#00D2FF] via-[#7928CA] to-[#FF007A] shrink-0 opacity-90`}
          />

          {/* Typography Lockup: Pairing 9 (Arima Madurai + Mulish) */}
          <div className="flex flex-col text-left justify-center space-y-0.5">
            {/* Quickupp in Arima Madurai */}
            <span
              className={`font-arima ${quickuppTextSizes} ${
                isDark ? 'text-white' : 'text-[#0B132B]'
              }`}
              style={{ fontFamily: "'Arima Madurai', 'Arima', cursive, serif" }}
            >
              Quickupp
            </span>

            {/* ContentoPs in Mulish with highlighted 'oPs' */}
            <div
              className={`font-mulish ${contentOpsTextSizes} flex items-center tracking-tight`}
              style={{ fontFamily: "'Mulish', sans-serif" }}
            >
              <span className="bg-gradient-to-r from-[#00A3FF] to-[#3B82F6] bg-clip-text text-transparent font-extrabold">
                Content
              </span>
              <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF007A] bg-clip-text text-transparent font-black ml-[1px]">
                oPs
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Aliases for clean re-exports
export const QuickuppLogo = ContentFlowLogo;
export default ContentFlowLogo;

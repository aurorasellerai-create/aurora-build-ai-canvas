import { memo } from "react";

interface AuroraLogoProps {
  size?: number;
  className?: string;
}

const AuroraLogo = memo(({ size = 34, className = "" }: AuroraLogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="gold-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B8860B" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
      <linearGradient id="gold-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DAA520" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <filter id="logo-glow">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFD700" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Outer shield / arrow shape */}
    <g filter="url(#logo-glow)">
      {/* Main "A" shape with upward arrow */}
      <path
        d="M50 8 L78 42 L68 42 L68 82 L58 82 L58 56 L42 56 L42 82 L32 82 L32 42 L22 42 Z"
        fill="url(#gold-grad)"
      />
      {/* Arrow tip accent */}
      <path
        d="M50 8 L62 28 L50 20 L38 28 Z"
        fill="url(#gold-grad)"
        opacity="0.9"
      />
      {/* "B" letter at bottom right */}
      <g transform="translate(60, 62)">
        <path
          d="M0 0 L0 20 L12 20 Q18 20 18 15 Q18 11 13 10 Q17 9 17 5 Q17 0 12 0 Z M5 4 L10 4 Q12 4 12 6 Q12 8 10 8 L5 8 Z M5 12 L11 12 Q13 12 13 14 Q13 16 11 16 L5 16 Z"
          fill="url(#gold-grad-dark)"
        />
      </g>
    </g>
  </svg>
));

AuroraLogo.displayName = "AuroraLogo";

export default AuroraLogo;

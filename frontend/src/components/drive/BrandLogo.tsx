import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center justify-center shrink-0', className)}>
      <svg
        viewBox="0 0 87.3 78"
        className="h-full w-full select-none"
        role="img"
        aria-label="9Drive logo"
      >
        <defs>
          {/* Subtle drop shadow for the center badge to elevate it from the ribbons */}
          <filter id="nineDriveCenterShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.5" floodOpacity="0.25" floodColor="#000000" />
          </filter>

          {/* Gradient for the central badge */}
          <linearGradient id="nineDriveDiskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFD" />
          </linearGradient>

          {/* Google Blue gradient for the number 9 */}
          <linearGradient id="nineDriveBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A73E8" />
            <stop offset="100%" stopColor="#0B57D0" />
          </linearGradient>
        </defs>

        {/* 1. Yellow Ribbon (Top-Right) */}
        <path d="M29.9 1.2h27.5L84.9 47H57.4L29.9 1.2z" fill="#FFBA00" />

        {/* 2. Red corner fold (Bottom-Right) */}
        <path
          d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z"
          fill="#EA4335"
        />

        {/* 3. Green Ribbon (Bottom) */}
        <path
          d="M13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53H27.5L13.75 76.8z"
          fill="#00AC47"
        />

        {/* 4. Darker Blue fold (Bottom-Left) */}
        <path
          d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z"
          fill="#0066DA"
        />

        {/* 5. Blue Ribbon (Left) */}
        <path
          d="M27.5 53l-13.75 23.8c-1.35-.8-2.5-1.9-3.3-3.3L.05 51.5c-.8-1.4-.8-2.95 0-4.5L24.05 3c.8-1.4 1.95-2.5 3.3-3.3l13.8 23.9L27.5 53z"
          fill="#2684FC"
        />

        {/* 6. Green subtle top overlap */}
        <path
          d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z"
          fill="#00AC47"
          opacity="0.18"
        />

        {/* Central Circular Badge */}
        <circle
          cx="43.65"
          cy="43.8"
          r="16.5"
          fill="url(#nineDriveDiskGrad)"
          stroke="#E2E7EE"
          strokeWidth="0.8"
          filter="url(#nineDriveCenterShadow)"
        />

        {/* Bold Number "9" in Center */}
        <text
          x="43.65"
          y="44.2"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Product Sans', 'Google Sans', 'Roboto', 'Segoe UI', system-ui, sans-serif"
          fontSize="22"
          fontWeight="800"
          fill="url(#nineDriveBlueGrad)"
        >
          9
        </text>
      </svg>
    </div>
  )
}


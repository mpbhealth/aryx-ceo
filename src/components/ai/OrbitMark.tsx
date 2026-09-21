import { cn } from '@/lib/utils';

type OrbitMarkProps = {
  size?: number;
  spinning?: boolean;
  className?: string;
};

export function OrbitMark({ size = 40, spinning = true, className }: OrbitMarkProps) {
  const coreId = `orbit-core-${size}`;
  const visorId = `orbit-visor-${size}`;
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={coreId} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#3A2A1C" />
            <stop offset="55%" stopColor="#141318" />
            <stop offset="100%" stopColor="#0B0B0D" />
          </radialGradient>
          <linearGradient id={visorId} x1="20" y1="30" x2="44" y2="38">
            <stop offset="0%" stopColor="#FF5A1F" />
            <stop offset="50%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FFC300" />
          </linearGradient>
        </defs>
        <g className={spinning ? 'orbit-ring' : undefined} style={{ transformOrigin: '32px 32px' }}>
          <ellipse
            cx="32"
            cy="32"
            rx="29"
            ry="11"
            fill="none"
            stroke="#FFC300"
            strokeOpacity="0.9"
            strokeWidth="1.4"
            transform="rotate(-28 32 32)"
          />
        </g>
        <ellipse
          cx="32"
          cy="32"
          rx="26"
          ry="9"
          fill="none"
          stroke="#FF7A00"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          transform="rotate(18 32 32)"
        />
        <circle cx="32" cy="32" r="16.5" fill={`url(#${coreId})`} />
        <circle cx="32" cy="32" r="16.5" fill="none" stroke="#FF5A1F" strokeOpacity="0.45" strokeWidth="1" />
        <path
          d="M22 30.5h20c.8 0 1.4.7 1.3 1.5l-.6 3.2c-.2 1.1-1.2 1.8-2.3 1.8H23.6c-1.1 0-2.1-.7-2.3-1.8L20.7 32c-.1-.8.5-1.5 1.3-1.5Z"
          fill={`url(#${visorId})`}
        />
        <circle cx="28" cy="33.2" r="1.15" fill="#0B0B0D" />
        <circle cx="36" cy="33.2" r="1.15" fill="#0B0B0D" />
        <circle cx="27.6" cy="32.8" r="0.35" fill="#FFF4D6" />
        <circle cx="35.6" cy="32.8" r="0.35" fill="#FFF4D6" />
        <path
          d="M26 39.5c2 1.4 10 1.4 12 0"
          fill="none"
          stroke="#FF7A00"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <circle cx="21" cy="18" r="1.6" fill="#FFC300" />
        <circle cx="44" cy="17.5" r="1.3" fill="#FF7A00" />
        <path d="M24 22.5 21.4 18.6" stroke="#A1A1AA" strokeWidth="1" />
        <path d="M40.5 22 43.6 18.2" stroke="#A1A1AA" strokeWidth="1" />
      </svg>
    </span>
  );
}

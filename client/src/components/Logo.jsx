/* Nail Disease Detector logo: a nail with a bite mark + scan line. Colors follow the active theme. */
export default function Logo({ size = 38 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label="Nail Disease Detector logo"
      className="logo-mark"
    >
      <defs>
        <linearGradient id="nbd-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--b)' }} />
        </linearGradient>
        <mask id="nbd-bite">
          <rect width="48" height="48" fill="#fff" />
          <circle cx="29" cy="13.5" r="3.4" fill="#000" />
          <circle cx="32.6" cy="18.2" r="2.6" fill="#000" />
          <circle cx="25.6" cy="11.8" r="2.2" fill="#000" />
        </mask>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#nbd-g)" />
      <path
        mask="url(#nbd-bite)"
        fill="#fff"
        d="M15.5 36V22.5C15.5 15 19.2 11 24 11s8.5 4 8.5 11.5V36c0 1.4-1.1 2.5-2.5 2.5H18c-1.4 0-2.5-1.1-2.5-2.5z"
      />
      <path d="M11 27h26" stroke="url(#nbd-g)" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M9 15V11a2 2 0 0 1 2-2h4M33 9h4a2 2 0 0 1 2 2v4M39 33v4a2 2 0 0 1-2 2h-4M15 39h-4a2 2 0 0 1-2-2v-4"
        fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  );
}

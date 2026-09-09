export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-glow`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M9 4h6l1 3H8l1-3Z" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M4 16v-2.2a3 3 0 0 1 .3-1.3l1.6-3.2A2 2 0 0 1 7.7 8h8.6a2 2 0 0 1 1.8 1.1l1.6 3.2c.2.4.3.9.3 1.3V16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M4 16h16v2h-3.5M4 18h3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="18.5" r="1.5" />
        <circle cx="16" cy="18.5" r="1.5" />
      </svg>
    </span>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span
        className={`font-display text-lg font-extrabold tracking-tight ${
          inverted ? "text-navy-foreground" : "text-foreground"
        }`}
      >
        Book<span className="text-primary">Taxi</span>
      </span>
    </span>
  );
}

import { useMemo } from "react";

/**
 * Premium animated black-and-gold background.
 * Flowing gold light streams (SVG paths with animated dash offsets),
 * drifting particles, and soft radial glows. Purely decorative.
 */
export function GoldFlowBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.5 + Math.random() * 3,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 8,
        opacity: 0.35 + Math.random() * 0.5,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* deep base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,209,0,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,209,0,0.08),transparent_60%)]" />

      {/* soft ambient glows */}
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-amber/20 blur-3xl animate-gold-drift-a" />
      <div className="absolute top-1/3 -right-40 h-[460px] w-[460px] rounded-full bg-amber/15 blur-3xl animate-gold-drift-b" />
      <div className="absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber/10 blur-3xl animate-gold-drift-c" />

      {/* flowing golden light streams */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="goldStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,209,0,0)" />
            <stop offset="50%" stopColor="rgba(255,209,0,0.9)" />
            <stop offset="100%" stopColor="rgba(255,209,0,0)" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#goldGlow)" stroke="url(#goldStream)" fill="none" strokeLinecap="round">
          <path
            d="M-100 220 C 200 120, 480 340, 760 220 S 1240 100, 1600 260"
            strokeWidth="1.2"
            className="gold-stream gold-stream-1"
          />
          <path
            d="M-100 380 C 220 300, 520 520, 820 400 S 1260 300, 1600 440"
            strokeWidth="1"
            className="gold-stream gold-stream-2"
          />
          <path
            d="M-100 520 C 260 460, 560 660, 880 540 S 1300 460, 1600 600"
            strokeWidth="1.4"
            className="gold-stream gold-stream-3"
          />
          <path
            d="M-100 680 C 240 620, 540 780, 860 700 S 1280 620, 1600 760"
            strokeWidth="0.9"
            className="gold-stream gold-stream-4"
          />
          <path
            d="M-100 120 C 300 60, 640 200, 960 100 S 1320 40, 1600 140"
            strokeWidth="0.8"
            className="gold-stream gold-stream-5"
          />
        </g>
      </svg>

      {/* floating gold particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-amber shadow-[0_0_10px_2px_rgba(255,209,0,0.7)] animate-gold-float"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* vignette for readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
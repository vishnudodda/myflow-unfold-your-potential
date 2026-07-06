import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  className?: string;
}

function parseNumber(value: string): {
  prefix: string;
  integerDigits: string[];
  decimalPart: string;
  suffix: string;
} {
  const match = value.match(/^([^\d]*)([\d,]+)(\.\d+)?([^\d]*)$/);
  if (!match) {
    return { prefix: value, integerDigits: [], decimalPart: "", suffix: "" };
  }
  const [, prefix = "", intRaw = "", dec = "", suffix = ""] = match;
  const integerDigits = intRaw.replace(/,/g, "").split("");
  const decimalPart = dec ? dec.slice(1) : "";
  return { prefix, integerDigits, decimalPart, suffix };
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function DigitReel({
  target,
  duration,
  delay,
}: {
  target: number;
  duration: number;
  delay: number;
}) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now() + delay;
    startRef.current = startTime;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const totalSpins = 2;
      const raw = eased * totalSpins * 10 + target * eased;
      const displayed = Math.floor(raw % 10);
      setCurrent(displayed);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, delay]);

  return (
    <span className="relative inline-block overflow-hidden h-[1em] w-[0.6em] align-bottom">
      <span
        className="flex flex-col items-center transition-transform will-change-transform"
        style={{
          transform: `translateY(-${current * 10}%)`,
          transitionDuration: "100ms",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="block h-[1em] leading-none text-center">
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedCounter({
  value,
  duration = 2200,
  className = "",
}: AnimatedCounterProps) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const { prefix, integerDigits, decimalPart, suffix } = parseNumber(value);

  if (!started || integerDigits.length === 0) {
    return <span className={className}>{value}</span>;
  }

  const digitDelay = duration / (integerDigits.length + decimalPart.length + 2);

  return (
    <span className={`tabular-nums inline-flex items-baseline ${className}`}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <span className="inline-flex">
        {integerDigits.map((d, i) => (
          <DigitReel
            key={`int-${i}`}
            target={parseInt(d, 10)}
            duration={duration}
            delay={i * digitDelay}
          />
        ))}
      </span>
      {decimalPart && (
        <span className="inline-flex items-baseline">
          <span className="mx-0.5">.</span>
          {decimalPart.split("").map((d, i) => (
            <DigitReel
              key={`dec-${i}`}
              target={parseInt(d, 10)}
              duration={duration}
              delay={(integerDigits.length + 1 + i) * digitDelay}
            />
          ))}
        </span>
      )}
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}

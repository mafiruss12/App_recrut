interface PoweredByProps {
  className?: string;
  light?: boolean;
}

/** Signature éditeur — KEVIN TECH PRO */
export function PoweredBy({ className = '', light = false }: PoweredByProps) {
  return (
    <p
      className={`text-center text-[10px] sm:text-[11px] tracking-wide ${
        light ? 'text-slate-400' : 'text-slate-500'
      } ${className}`}
    >
      Powered by{' '}
      <span className={`font-semibold ${light ? 'text-violet-300' : 'text-violet-400'}`}>
        KEVIN TECH PRO
      </span>
    </p>
  );
}

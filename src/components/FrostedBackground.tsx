export function FrostedBackground({ dark = false }: { dark?: boolean }) {
  if (dark) {
    return <div className="fixed inset-0 z-0 bg-slate-950 pointer-events-none" />;
  }

  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#f5f7fb] pointer-events-none" />
      <div className="fixed -top-32 -right-20 h-[420px] w-[420px] rounded-full bg-indigo-200/35 blur-[110px] pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-cyan-100/70 blur-[120px] pointer-events-none" />
    </>
  );
}

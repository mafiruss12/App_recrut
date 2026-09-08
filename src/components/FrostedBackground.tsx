export function FrostedBackground() {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 pointer-events-none" />
      <div className="fixed top-[-120px] left-[-80px] w-[480px] h-[480px] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[420px] h-[420px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[35%] right-[10%] w-[280px] h-[280px] bg-fuchsia-500/8 rounded-full blur-[100px] pointer-events-none" />
    </>
  );
}

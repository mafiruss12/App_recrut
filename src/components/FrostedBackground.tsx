export function FrostedBackground() {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#312e81] pointer-events-none" />
      <div className="fixed top-[-100px] left-[-100px] w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[420px] h-[420px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[15%] w-[320px] h-[320px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
    </>
  );
}

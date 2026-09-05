import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Smartphone, Users } from 'lucide-react';
import type { ReactNode } from 'react';

interface LandingPageProps {
  onOpenCommercial: () => void;
  onOpenAdmin: () => void;
  onOpenSuperAdmin: () => void;
}

export function LandingPage({ onOpenCommercial, onOpenAdmin, onOpenSuperAdmin }: LandingPageProps) {
  return (
    <main className="relative z-10 flex-1 bg-slate-50 text-slate-900 overflow-hidden">
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              K2L FIELD OPERATIONS
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 leading-[1.04]">
              Le recrutement terrain,
              <span className="block text-indigo-600">simple, suivi, maîtrisé.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-8 text-slate-600">
              Une plateforme sécurisée pour saisir les recrutements, suivre vos équipes et transformer les données terrain en décisions rapides.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onOpenCommercial} className="group inline-flex items-center gap-3 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">
                Accéder à l’espace terrain
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={onOpenAdmin} className="inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-700 border border-slate-200 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
                Espace manager
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">
              {['Mode offline', 'Doublons bloqués', 'Données par organisation'].map(item => (
                <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{item}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-indigo-200/40 blur-3xl" />
            <div className="relative rounded-[2rem] bg-slate-950 p-4 shadow-2xl shadow-slate-900/20 rotate-1">
              <div className="rounded-[1.5rem] bg-slate-900 p-5 sm:p-7 border border-white/10">
                <div className="flex items-center justify-between mb-7">
                  <div><p className="text-xs text-slate-400">Aujourd’hui</p><p className="text-xl font-bold text-white">Activité terrain</p></div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Clients saisis</p><p className="mt-1 text-3xl font-black text-white">128</p><p className="mt-1 text-[11px] text-emerald-400">+18% cette semaine</p></div>
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Équipe active</p><p className="mt-1 text-3xl font-black text-white">24</p><p className="mt-1 text-[11px] text-indigo-300">sur 27 commerciaux</p></div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4"><span>Progression de la semaine</span><span className="text-white font-bold">78%</span></div>
                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" /></div>
                  <div className="flex items-end gap-2 h-20 mt-5">{[38, 55, 44, 72, 61, 84, 78].map((height, index) => <div key={index} className="flex-1 rounded-t-lg bg-indigo-500/70" style={{ height: `${height}%` }} />)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 grid sm:grid-cols-3 gap-8">
          <Feature icon={<Smartphone />} title="Pensé pour le terrain" text="Une saisie rapide sur mobile, même lorsque le réseau est instable." />
          <Feature icon={<Users />} title="Une équipe connectée" text="Chaque commercial travaille dans son espace et reste rattaché à son organisation." />
          <Feature icon={<ShieldCheck />} title="Des accès maîtrisés" text="Des portails distincts pour les commerciaux, managers et super administrateurs." />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-7 text-center">
        <button onClick={onOpenSuperAdmin} className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Administration plateforme →</button>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-4"><div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">{icon}</div><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></div>;
}

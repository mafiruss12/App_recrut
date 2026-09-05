import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Database,
  Github,
  Globe,
  FileSpreadsheet,
  Terminal,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface AuditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_SCHEMA = `-- SCHEMA SQL POUR PROJET SUPABASE: wfeygwvvvyjomyahdgrc
-- Coller dans : Supabase Dashboard > SQL Editor > New Query > Run

CREATE TABLE IF NOT EXISTS public.commerciaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  localite VARCHAR(150),
  cabinet VARCHAR(150),
  partenaire VARCHAR(150),
  action VARCHAR(255),
  role VARCHAR(20) DEFAULT 'commercial',
  is_active BOOLEAN DEFAULT true,
  session_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50) NOT NULL,
  client_phone_clean VARCHAR(50) NOT NULL,
  commercial_id UUID REFERENCES public.commerciaux(id) ON DELETE SET NULL,
  commercial_name VARCHAR(255),
  commercial_phone VARCHAR(50),
  cabinet VARCHAR(150),
  localite VARCHAR(150),
  partenaire VARCHAR(150),
  action VARCHAR(255),
  status VARCHAR(30) DEFAULT 'synced',
  notes TEXT,
  synced_to_sheets BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_phone_clean ON public.clients(client_phone_clean);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

ALTER TABLE public.commerciaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write on commerciaux" 
  ON public.commerciaux FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on clients" 
  ON public.clients FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.commerciaux (phone, code, name, localite, cabinet, partenaire, action, role)
VALUES 
  ('0708091011', '1234', 'Mafi Russ', 'Abidjan Plateau', 'Cabinet Alpha', 'Partenaire Orange', 'Prospection Terrain', 'commercial'),
  ('0102030405', '5678', 'Jean Dupont', 'Cocody', 'Buro Pro', 'Partenaire MTN', 'Recrutement Direct', 'commercial'),
  ('0505050505', '2026', 'Directeur K2L', 'Siège Abidjan', 'Direction Générale', 'K2L Groupe', 'Supervision Globale', 'manager')
ON CONFLICT (phone) DO NOTHING;`;

const APPS_SCRIPT_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Date Saisie", "Téléphone Client", "Commercial", "Tél Commercial", "Cabinet", "Localité", "Partenaire", "Action", "Statut"]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }
    var requestData = JSON.parse(e.postData.contents);
    var clients = Array.isArray(requestData) ? requestData : [requestData];
    var added = 0;
    clients.forEach(function(item) {
      sheet.appendRow([
        item.id || Utilities.getUuid(),
        item.created_at || new Date().toISOString(),
        item.client_phone || "",
        item.commercial_name || "",
        item.commercial_phone || "",
        item.cabinet || "",
        item.localite || "",
        item.partenaire || "",
        item.action || "",
        item.status || "synced"
      ]);
      added++;
    });
    return ContentService.createTextOutput(JSON.stringify({ result: "success", added: added })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export function AuditStatusModal({ isOpen, onClose }: AuditStatusModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'sql' | 'sheets'>('summary');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'sql' | 'script') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/15 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              K2
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Vérification du Projet & Statut</h2>
              <p className="text-xs text-slate-400">
                Projet Supabase: <span className="text-indigo-400 font-mono">wfeygwvvvyjomyahdgrc</span> • GitHub: <span className="text-indigo-400 font-mono">mafiruss12/App_recrut</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center border border-white/10"
          >
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Synthèse : Ce qui a été fait vs Ce qui reste
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script SQL Supabase (Prêt à exécuter)
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sheets'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script Google Sheets Apps Script
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Ce qui a été fait */}
              <div className="backdrop-blur-md bg-indigo-950/30 border border-indigo-500/30 p-5 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-3 text-indigo-300 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>1. Ce qui a déjà été vérifié et réalisé :</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">GitHub Repository Configuré :</strong> Le dépôt{' '}
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">mafiruss12/App_recrut</code> est
                      accessible avec le token fourni (`ghp_...`).
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Projet Vercel Prêt & Lié :</strong> Le projet Vercel{' '}
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">app-recrut</code> est relié au dépôt
                      GitHub et contient déjà les variables d'environnement Supabase.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Instance Supabase Active :</strong> L'instance{' '}
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">wfeygwvvvyjomyahdgrc</code> répond
                      avec succès via REST.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Détection des Doublons en Temps Réel :</strong> L'application normalise
                      automatiquement les numéros (+225, 07, espaces) et bloque instantanément toute ressaisie avec alerte visuelle.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Mode Hors Ligne & PWA :</strong> Fonctionne sans connexion internet avec
                      mise en file d'attente automatique et badge de synchronisation.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Tableau Manager & Multi-Exports :</strong> Tableau style Google Sheets avec
                      recherche, tris, filtres par commercial/cabinet/date, et exports réels en Excel (.xlsx), CSV, et PDF.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <div>
                      <strong className="text-white">Thème Design Frosted Glass :</strong> Interface verre dépoli moderne avec
                      palette sombre élégante, gradients et orbes lumineux.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Ce qui reste à faire */}
              <div className="backdrop-blur-md bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-3 text-amber-300 font-bold text-base">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>2. Ce qui reste à finaliser (3 étapes concrètes) :</span>
                </div>
                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">
                          1
                        </span>
                        Créer les tables dans Supabase (1 clic)
                      </span>
                      <button
                        onClick={() => setActiveTab('sql')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Voir le script SQL →
                      </button>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      L'instance Supabase n'a pas encore exécuté la création des tables <code className="text-indigo-300">clients</code> et <code className="text-indigo-300">commerciaux</code>. Copiez le script fourni dans l'onglet SQL et collez-le dans le SQL Editor de Supabase.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">
                          2
                        </span>
                        Pousser le code final sur GitHub & Déclencher Vercel
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Le précédent build Vercel a échoué car le package Supabase manquait sur le commit initial. Avec l'application complète compilée ici, la synchronisation GitHub déclenchera le build automatique sans erreur sur Vercel.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">
                          3
                        </span>
                        Connecter le Webhook Google Sheets
                      </span>
                      <button
                        onClick={() => setActiveTab('sheets')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Voir le script Sheets →
                      </button>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Si vous souhaitez une synchronisation automatique en direct dans votre Google Sheet (en plus de l'application), déployez le Google Apps Script fourni en Web App et collez l'URL dans les paramètres.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Script de création des tables Supabase</h3>
                  <p className="text-xs text-slate-400">
                    Rendez-vous sur Supabase &gt; SQL Editor &gt; New Query &gt; Collez puis cliquez sur "Run".
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard/project/wfeygwvvvyjomyahdgrc/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
                  >
                    <span>Ouvrir Supabase SQL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => copyToClipboard(SQL_SCHEMA, 'sql')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSql ? 'Copié !' : 'Copier le SQL'}</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed">
                {SQL_SCHEMA}
              </pre>
            </div>
          )}

          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Code Google Apps Script pour Google Sheet</h3>
                  <p className="text-xs text-slate-400">
                    Ouvrez votre Google Sheet &gt; Extensions &gt; Apps Script &gt; Collez &gt; Déployer en tant qu'application Web.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(APPS_SCRIPT_CODE, 'script')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript ? 'Copié !' : 'Copier le Script'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 text-sky-300 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, type FormEvent } from 'react';
import { FileSpreadsheet, Send, CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { storage } from '../lib/storage';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoogleSheetsModal({ isOpen, onClose, onSuccess }: GoogleSheetsModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const settings = storage.getSettings();
      setWebhookUrl(settings.googleSheetsWebhookUrl || '');
      setAutoSync(settings.autoSyncGoogleSheets);
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    storage.saveSettings({
      googleSheetsWebhookUrl: webhookUrl.trim(),
      autoSyncGoogleSheets: autoSync,
    });
    onSuccess();
    onClose();
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setTestStatus('Veuillez renseigner une URL de Webhook Google Apps Script.');
      return;
    }

    setIsTesting(true);
    setTestStatus('Envoi d’une ligne test vers Google Sheet...');

    try {
      const testPayload = {
        id: 'test-' + Date.now(),
        created_at: new Date().toISOString(),
        client_phone: '+225 07 00 00 00 00',
        commercial_name: 'Test K2L Admin',
        commercial_phone: '0505050505',
        cabinet: 'Test Cabinet',
        localite: 'Plateau',
        partenaire: 'Test Partenaire',
        action: 'Test Liaison',
        status: 'synced',
      };

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      setIsTesting(false);
      setTestStatus('✓ Requête envoyée ! Vérifiez que la ligne apparaît dans votre feuille Google Sheet.');
    } catch (err: any) {
      setIsTesting(false);
      setTestStatus(`Erreur lors du test: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-600/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Liaison Google Sheets</h2>
            <p className="text-xs text-slate-400">Synchronisation automatisée des saisies en direct</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              URL de l'application Web Google Apps Script
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Créez une Web App depuis le menu Extensions &gt; Apps Script de votre Google Sheet.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="chk-auto-sync"
              checked={autoSync}
              onChange={e => setAutoSync(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="chk-auto-sync" className="text-xs text-slate-200 cursor-pointer">
              Synchroniser automatiquement chaque nouvelle saisie terrain avec Google Sheets
            </label>
          </div>

          {testStatus && (
            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-emerald-300">
              {testStatus}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={isTesting}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs border border-white/10 transition-colors"
            >
              {isTesting ? 'Test en cours...' : 'Tester la liaison'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

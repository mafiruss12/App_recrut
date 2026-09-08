/**
 * POST /api/sheets-proxy
 * Relais Google Apps Script / webhook avec feedback HTTP réel (évite no-cors).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const webhookUrl = String(body.webhookUrl || '').trim();
  const payload = body.payload;

  if (!webhookUrl || !/^https:\/\//i.test(webhookUrl)) {
    return res.status(400).json({ ok: false, message: 'URL webhook Google Sheets invalide.' });
  }

  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await r.text().catch(() => '');
    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        message: `Google Sheets a répondu ${r.status}. Vérifiez le script / permissions.`,
        detail: text.slice(0, 200),
      });
    }
    return res.status(200).json({ ok: true, status: r.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return res.status(502).json({ ok: false, message: `Impossible de joindre Google Sheets : ${msg}` });
  }
}

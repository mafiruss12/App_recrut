/**
 * POST /api/clients-insert
 * Insert client avec service_role + contrôle session + anti-doublon serveur.
 * Header: X-Session-Token
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient, normalizePhone, resolveSession } from './_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY manquant sur Vercel (Settings → Environment Variables).',
    });
  }

  const token = String(req.headers['x-session-token'] || '');
  const session = await resolveSession(sb, token);
  if (!session) {
    return res.status(401).json({
      ok: false,
      message: 'Session expirée ou invalide. Reconnectez-vous.',
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const clean = normalizePhone(body.client_phone_clean || body.client_phone || '');
  if (!clean || clean.length < 8) {
    return res.status(400).json({ ok: false, message: 'Numéro client invalide.' });
  }

  // Anti-doublon strict serveur
  const { data: existing } = await sb
    .from('clients')
    .select('id, commercial_name, cabinet, created_at')
    .eq('client_phone_clean', clean)
    .limit(1)
    .maybeSingle();

  if (existing && existing.id !== body.id) {
    await sb.from('audit_log').insert({
      action: 'duplicate_blocked_api',
      actor_phone: session.phone,
      payload: {
        client_phone: clean,
        commercial_id: session.id,
        existing_id: existing.id,
      },
    });
    const dateStr = existing.created_at
      ? new Date(existing.created_at).toLocaleDateString('fr-FR')
      : '';
    return res.status(409).json({
      ok: false,
      duplicate: true,
      message: `Doublon : déjà recruté le ${dateStr} par ${existing.commercial_name || 'un collègue'} (${existing.cabinet || '—'}).`,
    });
  }

  const row = {
    id: body.id || crypto.randomUUID(),
    client_phone: body.client_phone || clean,
    client_phone_clean: clean,
    commercial_id: body.commercial_id || session.id,
    commercial_name: body.commercial_name || session.name,
    commercial_phone: body.commercial_phone || session.phone,
    cabinet: body.cabinet || 'K2L',
    localite: body.localite || '',
    partenaire: body.partenaire || '',
    action: body.action || 'Saisie Terrain',
    status: 'synced',
    notes: body.notes || null,
    created_at: body.created_at || new Date().toISOString(),
    synced_at: new Date().toISOString(),
  };

  // Sécurité : un commercial ne peut saisir que pour lui-même
  if (session.role === 'commercial' && row.commercial_id !== session.id) {
    return res.status(403).json({ ok: false, message: 'Action non autorisée.' });
  }

  const { error } = await sb.from('clients').upsert(row, { onConflict: 'id' });
  if (error) {
    if (/duplicate|unique|23505/i.test(error.message)) {
      return res.status(409).json({
        ok: false,
        duplicate: true,
        message: `Doublon : ${clean} existe déjà en base.`,
      });
    }
    return res.status(500).json({ ok: false, message: error.message });
  }

  return res.status(200).json({ ok: true, id: row.id });
}

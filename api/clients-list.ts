/**
 * GET /api/clients-list?limit=1000&offset=0
 * Liste clients selon le rôle de la session (service_role).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient, resolveSession } from './_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({ ok: false, message: 'Service non configuré' });
  }

  const token = String(req.headers['x-session-token'] || req.query.token || '');
  const session = await resolveSession(sb, token);
  if (!session) {
    return res.status(401).json({ ok: false, message: 'Session invalide' });
  }

  const limit = Math.min(Number(req.query.limit) || 1000, 2000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  let query = sb
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (session.role === 'commercial') {
    query = query.eq('commercial_id', session.id);
  } else if (session.role === 'superviseur') {
    const { data: team } = await sb
      .from('commerciaux')
      .select('id')
      .eq('superviseur_id', session.id)
      .eq('is_active', true);
    const ids = [session.id, ...(team || []).map((t: { id: string }) => t.id)];
    query = query.in('commercial_id', ids);
  }
  // manager / admin : tout

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, message: error.message });
  return res.status(200).json({ ok: true, clients: data || [], offset, limit });
}

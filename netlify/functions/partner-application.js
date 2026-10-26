/**
 * LSB Réceptions — /devenir-partenaire
 *
 * Candidature de traiteur partenaire. AUCUNE intégration automatique au
 * réseau : cette fonction transmet uniquement la candidature à l'équipe
 * LSB Réceptions pour examen manuel (voir brief section 7 — une
 * candidature doit être examinée avant toute intégration, jamais publiée
 * ni transmise automatiquement à des clients).
 *
 * Variables d'environnement Netlify requises :
 *   RESEND_API_KEY (requis), RESEND_FROM (optionnel)
 *   PARTNER_EMAIL (optionnel — destinataire admin ; à défaut, voir ADMIN_FALLBACK_EMAIL)
 */

const TENANT_NAME = 'LSB Réceptions';
const ADMIN_FALLBACK_EMAIL = 'reservations@lsbreceptions.ca';

const MAX_SHORT = 200;
const MAX_LONG = 2000;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function singleLine(v, max){ return String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max || MAX_SHORT); }
function longText(v, max){ return String(v ?? '').trim().slice(0, max || MAX_LONG); }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePayload(payload){
  if (!payload || typeof payload !== 'object') return { ok:false, message: 'Requête invalide.' };
  if (payload.website) return { ok:false, message: 'Requête rejetée.' }; // honeypot

  const loadedAt = Number(payload.formLoadedAt);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const elapsed = Date.now() - loadedAt;
    if (elapsed >= 0 && elapsed < 2500) return { ok:false, message: 'Requête rejetée.' };
  }

  const companyName = singleLine(payload.companyName, MAX_SHORT);
  const contactName = singleLine(payload.contactName, MAX_SHORT);
  const email = singleLine(payload.email, MAX_SHORT);
  const phone = singleLine(payload.phone, 40);
  const territory = singleLine(payload.territory, MAX_SHORT);
  const specialties = longText(payload.specialties, MAX_LONG);
  const capacity = singleLine(payload.capacity, MAX_SHORT);
  const minimumOrder = singleLine(payload.minimumOrder, MAX_SHORT);
  const services = Array.isArray(payload.services) ? payload.services.map(s => singleLine(s, 60)).filter(Boolean).slice(0, 10) : [];
  const permits = longText(payload.permits, MAX_LONG);
  const comments = longText(payload.comments, MAX_LONG);

  if (!companyName) return { ok:false, message: "Le nom de l'entreprise est requis." };
  if (!contactName) return { ok:false, message: 'Le nom du contact est requis.' };
  if (!email || !EMAIL_RE.test(email)) return { ok:false, message: 'Une adresse courriel valide est requise.' };
  if (!phone) return { ok:false, message: 'Le téléphone est requis.' };
  if (!territory) return { ok:false, message: 'Les territoires desservis sont requis.' };
  if (!specialties) return { ok:false, message: 'Les spécialités et formules proposées sont requises.' };

  return { ok: true, clean: { companyName, contactName, email, phone, territory, specialties, capacity, minimumOrder, services, permits, comments } };
}

function generateApplicationRef(){
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PART-${year}-${rand}`;
}

async function sendResendEmail({ to, subject, html }){
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY manquant dans Netlify.');
  const from = process.env.RESEND_FROM || `${TENANT_NAME} <onboarding@resend.dev>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[Resend]', res.status, data);
    throw new Error(data.message || `Erreur d'envoi de l'email (${res.status})`);
  }
  return data;
}

function buildAdminEmailHtml(p, ref, submittedAt){
  const row = (label, value) => `<tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;font-size:14px;color:#2e221b">${esc(value) || '—'}</td></tr>`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#2e221b">
    <h2 style="font-size:18px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #7b1e2c;padding-bottom:10px">Nouvelle candidature traiteur partenaire — LSB Réceptions</h2>
    <p style="font-family:'Courier New',monospace;font-size:13px;color:#6e5c4e">Référence : <strong>${esc(ref)}</strong> — statut : <strong>à examiner</strong></p>
    <table style="border-collapse:collapse;width:100%;margin-top:14px">
      ${row('Entreprise', p.companyName)}
      ${row('Contact', p.contactName)}
      ${row('Courriel', p.email)}
      ${row('Téléphone', p.phone)}
      ${row('Territoires desservis', p.territory)}
      ${row('Capacité', p.capacity)}
      ${row('Minimum de commande', p.minimumOrder)}
      ${row('Services', p.services.join(', '))}
    </table>
    <h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Spécialités et formules</h3>
    <p style="font-size:14px">${esc(p.specialties)}</p>
    ${p.permits ? `<h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Permis et assurances déclarés</h3><p style="font-size:14px">${esc(p.permits)}</p>` : ''}
    ${p.comments ? `<h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Commentaires</h3><p style="font-size:14px">${esc(p.comments)}</p>` : ''}
    <p style="font-size:12px;color:#9c8b7a;margin-top:18px">Soumis le ${esc(submittedAt)}. Ne pas publier ni transmettre de demande client avant vérification des permis/assurances et accord explicite du partenaire.</p>
  </div>`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });
  if (event.httpMethod !== 'POST') return response(405, { success: false, message: 'Méthode non autorisée.' });

  let rawPayload;
  try { rawPayload = JSON.parse(event.body || '{}'); }
  catch (err) { return response(400, { success: false, message: 'Requête invalide.' }); }

  const validation = validatePayload(rawPayload);
  if (!validation.ok) return response(400, { success: false, message: validation.message });
  const payload = validation.clean;
  const ref = generateApplicationRef();
  const submittedAt = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

  try {
    const adminTo = process.env.PARTNER_EMAIL || ADMIN_FALLBACK_EMAIL;
    await sendResendEmail({
      to: adminTo,
      subject: `Candidature partenaire ${ref} — ${singleLine(payload.companyName, 80)}`,
      html: buildAdminEmailHtml(payload, ref, submittedAt),
    });
    return response(200, { success: true, applicationRef: ref });
  } catch (error) {
    console.error('[partner-application]', error);
    return response(500, { success: false, message: error.message || "Erreur lors de l'envoi de la candidature." });
  }
};

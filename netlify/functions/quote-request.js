/**
 * LSB Réceptions — /soumission
 *
 * Demande de soumission pour un service traiteur. AUCUN tarif, menu ou
 * disponibilité n'est calculé ou promis ici — chaque formule est "sur
 * proposition personnalisée" tant qu'un traiteur partenaire ne l'a pas
 * confirmée. Cette fonction se contente de recueillir la demande et de la
 * transmettre à l'équipe LSB Réceptions, qui assigne ensuite un partenaire
 * manuellement après examen (jamais automatique — voir brief).
 *
 * Architecture (du plus au moins critique) :
 *   1. EMAIL ADMIN (Resend) — OBLIGATOIRE. Si ça échoue, le client NE VOIT
 *      JAMAIS "Demande envoyée".
 *   2. EMAIL CLIENT (Resend) — accusé de réception, best-effort.
 *
 * Il n'y a pas encore de base de données connectée pour ce nouveau projet
 * (aucun tenant Supabase existant à réutiliser — site indépendant) : la
 * boîte courriel admin est actuellement la seule source de vérité pour les
 * demandes. À ajouter plus tard si un suivi structuré (statuts, assignation
 * de partenaire) devient nécessaire — voir brief section 9.
 *
 * Variables d'environnement Netlify requises :
 *   RESEND_API_KEY (requis), RESEND_FROM (optionnel)
 *   QUOTE_EMAIL (optionnel — destinataire admin ; à défaut, voir ADMIN_FALLBACK_EMAIL ci-dessous)
 */

const TENANT_NAME = 'LSB Réceptions';
// Placeholder explicite, PAS une vraie adresse vérifiée — à remplacer une
// fois l'adresse courriel réelle de l'agence confirmée (voir rapport).
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
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidISODate(s){
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

const FORMULE_LABELS = {
  'buffets': 'Buffets chauds et froids', 'boites-repas': 'Boîtes-repas', 'cocktails': 'Cocktails et bouchées',
  'repas-service': 'Repas avec service', 'dejeuners': 'Déjeuners et pauses-café',
};

function validatePayload(payload){
  if (!payload || typeof payload !== 'object') return { ok:false, message: 'Requête invalide.' };
  if (payload.website) return { ok:false, message: 'Requête rejetée.' }; // honeypot

  const loadedAt = Number(payload.formLoadedAt);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const elapsed = Date.now() - loadedAt;
    if (elapsed >= 0 && elapsed < 2500) return { ok:false, message: 'Requête rejetée.' };
  }

  const eventType = singleLine(payload.eventType, MAX_SHORT);
  const dateTbd = payload.dateTbd === true;
  const eventDate = singleLine(payload.eventDate, 20);
  const city = singleLine(payload.city, MAX_SHORT);
  const venue = singleLine(payload.venue, MAX_SHORT);
  const guestCount = singleLine(payload.guestCount, 20);
  const mealTime = singleLine(payload.mealTime, 10);
  const formuleId = singleLine(payload.formule, 40);
  const preferences = longText(payload.preferences, MAX_LONG);
  const budget = singleLine(payload.budget, MAX_SHORT);
  const services = Array.isArray(payload.services) ? payload.services.map(s => singleLine(s, 60)).filter(Boolean).slice(0, 10) : [];
  const allergies = longText(payload.allergies, MAX_LONG);
  const name = singleLine(payload.name, MAX_SHORT);
  const organization = singleLine(payload.organization, MAX_SHORT);
  const email = singleLine(payload.email, MAX_SHORT);
  const phone = singleLine(payload.phone, 40);
  const comments = longText(payload.comments, MAX_LONG);

  if (!eventType) return { ok:false, message: "Le type d'événement est requis." };
  if (!dateTbd && (!eventDate || !isValidISODate(eventDate))) return { ok:false, message: 'La date est invalide (ou cochez « date à confirmer »).' };
  if (!city) return { ok:false, message: 'La ville est requise.' };
  if (!guestCount || !Number.isFinite(Number(guestCount)) || Number(guestCount) < 1) return { ok:false, message: "Le nombre approximatif d'invités est requis." };
  if (!name) return { ok:false, message: 'Le nom est requis.' };
  if (!email || !EMAIL_RE.test(email)) return { ok:false, message: 'Une adresse courriel valide est requise.' };
  if (!phone) return { ok:false, message: 'Le téléphone est requis.' };

  return {
    ok: true,
    clean: { eventType, dateTbd, eventDate, city, venue, guestCount, mealTime, formuleId, preferences, budget, services, allergies, name, organization, email, phone, comments },
  };
}

function generateQuoteRef(){
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `LSB-${year}-${rand}`;
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

function buildAdminEmailHtml(p, quoteRef, submittedAt){
  const row = (label, value) => `<tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;font-size:14px;color:#2e221b">${esc(value) || '—'}</td></tr>`;
  const formuleLabel = p.formuleId ? (FORMULE_LABELS[p.formuleId] || p.formuleId) : 'À proposer';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#2e221b">
    <h2 style="font-size:18px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #7b1e2c;padding-bottom:10px">Nouvelle demande de soumission — LSB Réceptions</h2>
    <p style="font-family:'Courier New',monospace;font-size:13px;color:#6e5c4e">Référence : <strong>${esc(quoteRef)}</strong></p>
    <table style="border-collapse:collapse;width:100%;margin-top:14px">
      ${row("Type d'événement", p.eventType)}
      ${row('Date', p.dateTbd ? 'À confirmer' : p.eventDate)}
      ${row('Ville', p.city)}
      ${row('Lieu', p.venue)}
      ${row('Invités (approx.)', p.guestCount)}
      ${row('Heure du repas', p.mealTime)}
      ${row('Formule souhaitée', formuleLabel)}
      ${row('Budget indicatif', p.budget)}
      ${row('Services', p.services.join(', '))}
    </table>
    ${p.preferences ? `<h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Préférences culinaires</h3><p style="font-size:14px">${esc(p.preferences)}</p>` : ''}
    ${p.allergies ? `<h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Besoins alimentaires / allergies signalés</h3><p style="font-size:14px">${esc(p.allergies)}</p>` : ''}
    <h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Coordonnées</h3>
    <table style="border-collapse:collapse;width:100%">
      ${row('Nom', p.name)}
      ${row('Organisation', p.organization)}
      ${row('Courriel', p.email)}
      ${row('Téléphone', p.phone)}
    </table>
    ${p.comments ? `<h3 style="font-size:14px;margin-top:20px;border-bottom:1px solid #e5ddc9;padding-bottom:8px">Commentaires</h3><p style="font-size:14px">${esc(p.comments)}</p>` : ''}
    <p style="font-size:12px;color:#9c8b7a;margin-top:18px">Soumis le ${esc(submittedAt)}. Aucun partenaire n'a été assigné automatiquement — examiner la demande et assigner manuellement un traiteur partenaire adapté.</p>
  </div>`;
}

function buildClientEmailHtml(p, quoteRef){
  const formuleLabel = p.formuleId ? (FORMULE_LABELS[p.formuleId] || p.formuleId) : 'À proposer';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2e221b">
    <h2 style="font-size:18px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #7b1e2c;padding-bottom:10px">Votre demande a bien été reçue</h2>
    <p style="font-size:14px;line-height:1.6">Bonjour ${esc(p.name.split(' ')[0] || '')},</p>
    <p style="font-size:14px;line-height:1.6">Merci pour votre demande auprès de <strong>LSB Réceptions</strong>. Voici un résumé :</p>
    <p style="font-family:'Courier New',monospace;font-size:13px;color:#6e5c4e">Référence : <strong>${esc(quoteRef)}</strong></p>
    <table style="border-collapse:collapse;width:100%;margin-top:10px">
      <tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px">Type d'événement</td><td style="font-size:14px">${esc(p.eventType)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px">Date</td><td style="font-size:14px">${esc(p.dateTbd ? 'À confirmer' : p.eventDate)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px">Ville</td><td style="font-size:14px">${esc(p.city)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6e5c4e;font-size:13px">Formule souhaitée</td><td style="font-size:14px">${esc(formuleLabel)}</td></tr>
    </table>
    <p style="font-size:14px;line-height:1.7;margin-top:20px;padding:14px 16px;background:#faf6ec;border-left:3px solid #7b1e2c">
      <strong>Important :</strong> cette référence confirme que votre demande est <strong>en cours d'examen</strong> — elle ne constitue
      <strong>ni une réservation, ni un menu, ni un prix confirmés</strong>. Notre équipe recherche un traiteur partenaire adapté et vous
      transmettra une proposition personnalisée.
    </p>
    <p style="font-size:14px;line-height:1.6;margin-top:18px">Une question en attendant ? Répondez simplement à ce courriel.</p>
    <p style="font-size:13px;color:#6e5c4e;margin-top:24px">LSB Réceptions</p>
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
  const quoteRef = generateQuoteRef();
  const submittedAt = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

  try {
    const adminTo = process.env.QUOTE_EMAIL || ADMIN_FALLBACK_EMAIL;
    await sendResendEmail({
      to: adminTo,
      subject: `Soumission ${quoteRef} — ${singleLine(payload.name, 80)}`,
      html: buildAdminEmailHtml(payload, quoteRef, submittedAt),
    });

    try {
      await sendResendEmail({
        to: payload.email,
        subject: `Votre demande ${quoteRef} est en cours d'examen — LSB Réceptions`,
        html: buildClientEmailHtml(payload, quoteRef),
      });
    } catch (err) {
      console.warn('[Resend:client] accusé de réception non envoyé (best-effort) —', err.message);
    }

    return response(200, { success: true, quoteRef });
  } catch (error) {
    console.error('[quote-request]', error);
    return response(500, { success: false, message: error.message || "Erreur lors de l'envoi de la demande." });
  }
};

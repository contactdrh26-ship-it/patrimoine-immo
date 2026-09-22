// ═══════════════════════════════════════════════════════════════════
// AVIS D'ÉCHÉANCE AUTOMATIQUES — envoyés le 1er de chaque mois
// Déclenché par le cron Vercel (voir vercel.json) ou manuellement :
//   https://project-wlavw.vercel.app/api/send-avis            → envoi du mois (1 seule fois, verrou)
//   https://project-wlavw.vercel.app/api/send-avis?test=1&to=votre@email.com → 1 avis d'exemple
// Prérequis : variable d'environnement EMAILJS_PRIVATE_KEY dans Vercel
//             + "Allow EmailJS API for non-browser applications" coché dans EmailJS
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://mighrpmsvlnqobpjefcb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2hycG1zdmxucW9icGplZmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODc2MTIsImV4cCI6MjA5NTQ2MzYxMn0.XTFJTVMlh7QMeywZRx9NpoJ7YV8FRx_3vlh3b7zp2ks';

const EMAILJS = {
  service: 'service_l0wg71i',
  template: 'template_etij2b7',
  publicKey: 'egq016Eb6yWUhZ03o'
};

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const BAILLEURS = {
  'Bismuth Jacques':'Bismuth Jacques',
  'Sophie Bismuth':'Bismuth Sophie',
  'SCI SJ Immo':'SCI SJ IMMO',
  'SCI VB Immo':'SCI VB IMMO',
  'SCI BOBI Immo':'SCI BOBI IMMO',
  'SCI JML Immo':'SCI JML IMMO',
  // alias historiques
  'PSB Pasteur':'SCI SJ IMMO',
  'SCI SJ Immo Gagny':'SCI SJ IMMO',
  'SCI SJ 5Q Pasteur':'SCI SJ IMMO'
};

// ── Requêtes Supabase (REST) ──
async function sbGet(table, params){
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params||'select=*'}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if(!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function sbInsert(table, row){
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal' },
    body: JSON.stringify(row)
  });
  if(!r.ok) throw new Error(`Supabase insert ${table}: ${r.status} ${await r.text()}`);
}

// ── Prorata d'occupation (même logique que le dashboard) ──
function joursOccupes(b, m, y){
  const start = new Date(y, m, 1), end = new Date(y, m+1, 0);
  const daysIn = end.getDate();
  const far = new Date(1900,0,1), fut = new Date(2200,0,1);
  const din = b.din ? new Date(b.din) : null, dout = b.dout ? new Date(b.dout) : null;
  let segs;
  if(!dout) segs = [[din||far, fut]];
  else if(din && din > dout) segs = [[far, dout],[din, fut]];
  else segs = [[din||far, dout]];
  let days = 0;
  segs.forEach(sg => {
    const s = sg[0] > start ? sg[0] : start, e = sg[1] < end ? sg[1] : end;
    if(e >= s) days += Math.round((e - s) / 86400000) + 1;
  });
  return Math.min(days, daysIn);
}
function loyerAttendu(b, m, y){
  if(!b.l && !b.din && !b.dout) return 0;
  const daysIn = new Date(y, m+1, 0).getDate();
  const dj = joursOccupes(b, m, y);
  if(dj >= daysIn) return b.loy || 0;
  return Math.round((b.loy || 0) * dj / daysIn);
}

// ── HTML de l'avis d'échéance ──
function genAvisHTML(b, bailleurNom, moisNom, annee, attendu){
  const chg = b.chg || 0;
  const loyerHC = Math.max(0, attendu - chg);
  const ref = `AVI-${annee}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(b.id).padStart(3,'0')}`;
  const fmt = n => n.toLocaleString('fr-FR') + ' €';
  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;color:#0d1a35;border:1px solid #e0e6f0;border-radius:8px;overflow:hidden;">
    <div style="background:#003F87;padding:22px 28px;color:#fff;">
      <div style="font-size:11px;opacity:.7;margin-bottom:4px;">${ref}</div>
      <h2 style="margin:0;font-size:22px;">Avis d'échéance</h2>
      <div style="font-size:12px;opacity:.75;margin-top:4px;text-transform:uppercase;letter-spacing:.05em;">${moisNom} ${annee}</div>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:13px;line-height:1.7;">Bonjour ${b.l||''},</p>
      <p style="font-size:13px;line-height:1.7;">
        Veuillez trouver ci-dessous le détail du loyer et des charges à régler <b>d'avance</b>
        pour le mois de <b>${moisNom} ${annee}</b>, concernant le logement situé :<br>
        <b>${b.a||''}</b>
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eef1f7;">Loyer hors charges</td><td style="text-align:right;border-bottom:1px solid #eef1f7;">${fmt(loyerHC)}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eef1f7;">Charges</td><td style="text-align:right;border-bottom:1px solid #eef1f7;">${fmt(chg)}</td></tr>
        <tr><td style="padding:10px 0;font-weight:bold;font-size:15px;">TOTAL À RÉGLER</td><td style="text-align:right;font-weight:bold;font-size:15px;color:#003F87;">${fmt(attendu)}</td></tr>
      </table>
      <p style="font-size:12px;line-height:1.7;color:#555;">
        Règlement par virement, à réception du présent avis.<br>
        Le présent avis d'échéance ne constitue pas une quittance : celle-ci vous sera adressée après encaissement.
      </p>
      <p style="font-size:13px;margin-top:22px;">Cordialement,<br><b>${bailleurNom}</b></p>
    </div>
    <div style="background:#f0f5fc;padding:10px 28px;font-size:10px;color:#6272a0;">
      Document généré automatiquement · Patrimoine Immobilier
    </div>
  </div>`;
}

// ── Envoi EmailJS (mode serveur : nécessite la Private Key) ──
async function envoyerEmail(to, subject, html, fromName){
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.service,
      template_id: EMAILJS.template,
      user_id: EMAILJS.publicKey,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: { to_email: to, subject, message: html, name: fromName||'Gestion Locative', email: 'contactdrh26@gmail.com' }
    })
  });
  if(!r.ok) throw new Error(await r.text());
}

module.exports = async (req, res) => {
  try {
    if(!process.env.EMAILJS_PRIVATE_KEY){
      return res.status(500).json({ erreur: "Variable EMAILJS_PRIVATE_KEY manquante dans Vercel (Settings → Environment Variables)" });
    }

    const now = new Date();
    const m = now.getUTCMonth(), y = now.getUTCFullYear();
    const moisNom = MOIS_FR[m];
    const moisKey = `${y}-${String(m+1).padStart(2,'0')}`;

    // Données
    const [biens, emailsRows] = await Promise.all([
      sbGet('biens', 'select=*'),
      sbGet('locataire_emails', 'select=*')
    ]);
    const emails = {};
    emailsRows.forEach(r => { emails[r.bien_id] = r.email; });

    // ── Mode test : un seul avis d'exemple, sans verrou ──
    if(req.query && req.query.test){
      const to = req.query.to || 'contactdrh26@gmail.com';
      const b = biens.find(x => x.l && loyerAttendu(x, m, y) > 0) || biens[0];
      const bailleur = BAILLEURS[b.e] || 'Bismuth Jacques';
      const att = loyerAttendu(b, m, y) || b.loy || 0;
      await envoyerEmail(to, `[TEST] Avis d'échéance — ${moisNom} ${y}`, genAvisHTML(b, bailleur, moisNom, y, att), bailleur);
      return res.status(200).json({ test: true, envoye_a: to, exemple_bien: b.n });
    }

    // ── Verrou : un seul envoi par mois ──
    const dejaFait = await sbGet('avis_log', `mois=eq.${moisKey}&select=mois`);
    if(dejaFait.length){
      return res.status(200).json({ mois: moisKey, statut: 'déjà envoyé ce mois-ci, rien à faire' });
    }

    // ── Construction de la liste ──
    const aEnvoyer = [];
    const ignores = [];
    biens.forEach(b => {
      const email = emails[b.id];
      const att = loyerAttendu(b, m, y);
      if(!b.l){ ignores.push(`${b.n} (vacant)`); return; }
      if(att <= 0){ ignores.push(`${b.n} (0 € attendu)`); return; }
      if(!email){ ignores.push(`${b.n} (pas d'email)`); return; }
      aEnvoyer.push({ b, email, att, bailleur: BAILLEURS[b.e] || 'Bismuth Jacques' });
    });

    // ── Envoi par paquets de 5 ──
    const envoyes = [], erreurs = [];
    for(let i = 0; i < aEnvoyer.length; i += 5){
      const paquet = aEnvoyer.slice(i, i+5);
      await Promise.all(paquet.map(async ({ b, email, att, bailleur }) => {
        try {
          await envoyerEmail(email, `Avis d'échéance — ${moisNom} ${y}`, genAvisHTML(b, bailleur, moisNom, y, att), bailleur);
          envoyes.push(`${b.l} (${email})`);
        } catch(e){
          erreurs.push(`${b.l}: ${String(e.message).slice(0,120)}`);
        }
      }));
    }

    // ── Verrou posé même si quelques erreurs, pour éviter les doublons ──
    await sbInsert('avis_log', { mois: moisKey, nb: envoyes.length });

    return res.status(200).json({ mois: `${moisNom} ${y}`, envoyes: envoyes.length, details: envoyes, ignores, erreurs });
  } catch(e){
    return res.status(500).json({ erreur: String(e.message) });
  }
};

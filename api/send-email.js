// ── Génération d'une quittance PDF sans aucune librairie externe ──────
function buildQuittancePDF(d) {
  const esc = s => String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u20AC/g, 'EUR').replace(/[^\x00-\xFF]/g, '');

  const BLEU = '0.0 0.247 0.529';
  const GRIS = '0.38 0.45 0.63';
  const NOIR = '0.1 0.1 0.1';

  const textW = (str, size) => String(str).length * size * 0.5;
  const rightX = (str, size, rightEdge) => rightEdge - textW(str, size);

  let c = '';
  c += `${BLEU} rg\n50 742 495 60 re f\n`;
  c += `1 1 1 rg\nBT /F2 20 Tf 70 770 Td (Quittance de Loyer) Tj ET\n`;
  c += `BT /F1 10 Tf 70 752 Td (${esc(d.moisNom + ' ' + d.annee + '  -  Emise le ' + d.dateEmission)}) Tj ET\n`;
  const refTxt = 'Ref. ' + (d.ref || '');
  c += `BT /F1 9 Tf ${rightX(refTxt, 9, 525)} 775 Td (${esc(refTxt)}) Tj ET\n`;

  let y = 700;
  c += `${BLEU} rg\nBT /F2 10 Tf 70 ${y} Td (BAILLEUR) Tj ET\n`;
  c += `BT /F2 10 Tf 320 ${y} Td (LOCATAIRE) Tj ET\n`;
  y -= 16;
  c += `${NOIR} rg\nBT /F2 11 Tf 70 ${y} Td (${esc(d.bailleurNom)}) Tj ET\n`;
  c += `BT /F2 11 Tf 320 ${y} Td (${esc(d.locataireNom)}) Tj ET\n`;
  y -= 14;
  c += `${GRIS} rg\nBT /F1 9 Tf 70 ${y} Td (${esc(d.bailleurAdr)}) Tj ET\n`;
  c += `BT /F1 9 Tf 320 ${y} Td (${esc(d.locataireAdr)}) Tj ET\n`;
  y -= 12;
  c += `BT /F1 9 Tf 70 ${y} Td (${esc(d.bailleurVille)}) Tj ET\n`;

  y -= 42;
  c += `${BLEU} rg\n50 ${y - 30} 495 56 re f\n`;
  c += `1 1 1 rg\nBT /F1 9 Tf 70 ${y + 12} Td (${esc('Loyer + charges du mois de ' + d.moisNom + ' ' + d.annee)}) Tj ET\n`;
  c += `BT /F2 24 Tf 70 ${y - 18} Td (${esc(d.montant + ' EUR')}) Tj ET\n`;
  c += `BT /F1 9 Tf 440 ${y + 12} Td (Statut: PAYE) Tj ET\n`;

  y -= 62;
  c += `${NOIR} rg\nBT /F2 11 Tf 70 ${y} Td (Detail du reglement) Tj ET\n`;
  y -= 6;
  const rows = [
    ['Bien loue', d.bienNom],
    ['Adresse du bien', d.locataireAdr],
    ['Loyer hors charges', d.loyerHC + ' EUR'],
    ['Charges', d.charges + ' EUR'],
    ['Total encaisse', d.montant + ' EUR'],
    ['Periode', 'Du 1er au 30/31 ' + d.moisNom + ' ' + d.annee],
    ['Date de paiement', d.datePaiement],
    ['Mode de paiement', d.mode],
  ];
  for (const [k, v] of rows) {
    y -= 19;
    c += `0.88 0.91 0.96 rg\n50 ${y - 5} 495 0.6 re f\n`;
    c += `${GRIS} rg\nBT /F1 10 Tf 70 ${y} Td (${esc(k)}) Tj ET\n`;
    c += `${NOIR} rg\nBT /F2 10 Tf ${rightX(v, 10, 525)} ${y} Td (${esc(v)}) Tj ET\n`;
  }

  y -= 38;
  c += `${GRIS} rg\nBT /F1 8 Tf 70 ${y} Td (La presente quittance annule tous les recus etablis precedemment pour ce loyer.) Tj ET\n`;
  y -= 11;
  c += `BT /F1 8 Tf 70 ${y} Td (Delivree conformement a l'article 21 de la loi n.89-462 du 6 juillet 1989.) Tj ET\n`;

  y -= 45;
  c += `${GRIS} rg\nBT /F1 9 Tf 70 ${y} Td (${esc('Fait le ' + d.dateEmission + ' a ' + d.bailleurVille)}) Tj ET\n`;
  c += `${NOIR} rg\nBT /F2 11 Tf 380 ${y} Td (${esc(d.bailleurNom)}) Tj ET\n`;
  c += `${GRIS} rg\nBT /F1 9 Tf 380 ${y - 13} Td (Proprietaire / Bailleur) Tj ET\n`;
  if (d.bailleurTel) c += `BT /F1 9 Tf 380 ${y - 25} Td (${esc(d.bailleurTel)}) Tj ET\n`;

  c += `${GRIS} rg\nBT /F1 8 Tf 70 60 Td (${esc('Ref. ' + (d.ref || '') + '  -  ' + d.bailleurNom + '  -  ' + (d.bailleurEmail || ''))}) Tj ET\n`;
  c += `BT /F1 8 Tf 70 49 Td (${esc('Document genere automatiquement - Patrimoine Immobilier ' + d.annee)}) Tj ET\n`;

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>');
  objects.push(`<< /Length ${Buffer.byteLength(c, 'latin1')} >>\nstream\n${c}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const { to, from, subject, html, quittance, pdfFilename } = req.body;

    if (!to) return res.status(400).json({ error: "Destinataire (to) manquant" });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Clé RESEND_API_KEY non configurée sur le serveur" });

    const fromAddress = from && from.trim() ? from.trim() : 'onboarding@resend.dev';

    const emailPayload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Quittance de loyer',
      html: html || '<p>Veuillez trouver votre quittance ci-jointe.</p>'
    };

    if (quittance) {
      const pdfBuffer = buildQuittancePDF(quittance);
      emailPayload.attachments = [
        { filename: pdfFilename || 'quittance.pdf', content: pdfBuffer.toString('base64') }
      ];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();
    if (response.ok) {
      return res.status(200).json({ success: true, id: data.id });
    } else {
      return res.status(response.status).json({ error: data.message || JSON.stringify(data) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

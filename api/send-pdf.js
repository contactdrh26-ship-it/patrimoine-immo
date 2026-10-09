// ═══════════════════════════════════════════════════════════════════
// ENVOI EMAIL AVEC PIÈCE JOINTE PDF — via Gmail (contactdrh26@gmail.com)
// Utilisé par le dashboard pour les quittances et attestations.
// Prérequis : variable d'environnement GMAIL_APP_PASSWORD dans Vercel
// (mot de passe d'application Google, 16 caractères, sans espaces)
// ═══════════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

const GMAIL_USER = 'contactdrh26@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (POST uniquement)' });
  }
  if (!process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: "Variable GMAIL_APP_PASSWORD manquante dans Vercel (Settings → Environment Variables)" });
  }

  const { to, subject, html, fromName, pdfBase64, pdfFilename } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: 'Destinataire (to) et objet (subject) requis' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') }
  });

  const mail = {
    from: `"${(fromName || 'Gestion Locative').replace(/"/g, '')}" <${GMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html || '',
    attachments: []
  };
  if (pdfBase64) {
    mail.attachments.push({
      filename: pdfFilename || 'document.pdf',
      content: pdfBase64,
      encoding: 'base64',
      contentType: 'application/pdf'
    });
  }

  try {
    await transporter.sendMail(mail);
    return res.status(200).json({ success: true, to: to, piece_jointe: pdfFilename || null });
  } catch (e) {
    return res.status(500).json({ error: String(e.message).slice(0, 300) });
  }
};
